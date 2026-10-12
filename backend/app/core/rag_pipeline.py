import asyncio
import logging

from sqlalchemy import select

from app.core.chunking import chunk_text
from app.core.database import AsyncSessionLocal
from app.core.embeddings import get_embedding
from app.core.storage import read_file
from app.core.text_extraction import extract_text
from app.models.document import Document
from app.models.document_chunk import DocumentChunk

logger = logging.getLogger("campus_ai.rag_pipeline")

# How many chunk embeddings may be in flight at once. Each one is a blocking
# HTTP call to the embedding API, so they run in worker threads — never on
# the event loop, where a document with dozens of chunks would otherwise
# freeze every other request for as long as the embedding takes.
EMBEDDING_CONCURRENCY = 5


async def _embed_chunks(chunks: list[str]) -> list[list[float]]:
    semaphore = asyncio.Semaphore(EMBEDDING_CONCURRENCY)

    async def embed_one(chunk: str) -> list[float]:
        async with semaphore:
            return await asyncio.to_thread(get_embedding, chunk)

    # gather() returns results in input order, so chunk_index stays aligned.
    return list(await asyncio.gather(*(embed_one(chunk) for chunk in chunks)))


async def process_document(document_id: str) -> None:
    """Runs as a FastAPI BackgroundTask after upload — has its own DB
    session since the request's session is closed by the time this runs."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document).where(Document.id == document_id))
        document = result.scalar_one_or_none()
        if document is None:
            logger.error("process_document: document %s not found", document_id)
            return

        document.embedding_status = "processing"
        await db.commit()

        try:
            content = read_file(document.storage_path)
            text = extract_text(content, document.filename)
            chunks = chunk_text(text)

            if not chunks:
                document.embedding_status = "failed"
                await db.commit()
                logger.warning("document %s produced no chunks (empty/unreadable file)", document_id)
                return

            embeddings = await _embed_chunks(chunks)
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                db.add(DocumentChunk(document_id=document.id, chunk_index=i, content=chunk, embedding=embedding))

            document.embedding_status = "ready"
            await db.commit()
            logger.info("document %s processed: %d chunks", document_id, len(chunks))

        except Exception as exc:
            logger.exception("document %s processing failed: %s", document_id, exc)
            document.embedding_status = "failed"
            await db.commit()
