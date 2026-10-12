import asyncio
import logging

from sqlalchemy import select

from app.core.chunking import chunk_text
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.core.embeddings import get_embeddings
from app.core.storage import read_file
from app.core.text_extraction import extract_text
from app.models.document import Document
from app.models.document_chunk import DocumentChunk

logger = logging.getLogger("campus_ai.rag_pipeline")


def _read_and_chunk(storage_path: str, filename: str) -> list[str]:
    """File read + text extraction + chunking: all blocking / CPU-bound, so
    process_document runs this in a worker thread, not on the event loop."""
    content = read_file(storage_path)
    text = extract_text(content, filename)
    return chunk_text(text)


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
            chunks = await asyncio.to_thread(_read_and_chunk, document.storage_path, document.filename)

            if not chunks:
                document.embedding_status = "failed"
                await db.commit()
                logger.warning("document %s produced no chunks (empty/unreadable file)", document_id)
                return

            if len(chunks) > settings.MAX_CHUNKS_PER_DOCUMENT:
                document.embedding_status = "failed"
                await db.commit()
                logger.warning(
                    "document %s rejected: %d chunks exceeds the limit of %d",
                    document_id,
                    len(chunks),
                    settings.MAX_CHUNKS_PER_DOCUMENT,
                )
                return

            embeddings = await asyncio.to_thread(get_embeddings, chunks)
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=True)):
                db.add(DocumentChunk(document_id=document.id, chunk_index=i, content=chunk, embedding=embedding))

            document.embedding_status = "ready"
            await db.commit()
            logger.info("document %s processed: %d chunks", document_id, len(chunks))

        except Exception as exc:
            logger.exception("document %s processing failed: %s", document_id, exc)
            document.embedding_status = "failed"
            await db.commit()
