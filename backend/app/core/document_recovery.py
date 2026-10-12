"""Re-runs document processing that a restart or crash cut short.

Uploads are processed (chunk + embed, then File Organizer) in FastAPI
BackgroundTasks, which live only inside the running process: if the server
restarts mid-task, nothing ever resumes it and the document would sit in
"pending"/"processing" forever. This sweep runs once at startup and picks
those documents up again.

Only documents older than STUCK_DOCUMENT_MINUTES are touched, so an upload
that's genuinely still being processed by a live worker isn't picked up
twice. Re-running process_document is safe: it writes a document's chunks
and its "ready" status in a single commit, so a document that was cut short
never has partial chunks (any stray ones are cleared first anyway).
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, or_, select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.file_organizer import organize_document
from app.core.rag_pipeline import process_document
from app.models.document import Document
from app.models.document_chunk import DocumentChunk

logger = logging.getLogger("campus_ai.document_recovery")

_UNFINISHED = ("pending", "processing")


async def recover_stuck_documents() -> int:
    """Returns how many documents were re-queued. Never raises: a problem
    here must not stop the app from starting or serving requests."""
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.STUCK_DOCUMENT_MINUTES)

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Document.id, Document.embedding_status, Document.organize_status).where(
                    Document.created_at < cutoff,
                    or_(
                        Document.embedding_status.in_(_UNFINISHED),
                        Document.organize_status.in_(_UNFINISHED),
                    ),
                )
            )
            stuck = result.all()

        if not stuck:
            return 0

        logger.warning("recovering %d document(s) left unfinished by an earlier shutdown", len(stuck))

        recovered = 0
        for document_id, embedding_status, organize_status in stuck:
            try:
                if embedding_status in _UNFINISHED:
                    async with AsyncSessionLocal() as db:
                        await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))
                        await db.commit()
                    await process_document(str(document_id))
                if organize_status in _UNFINISHED:
                    await organize_document(str(document_id))
                recovered += 1
            except Exception as exc:  # noqa: BLE001
                logger.exception("could not recover document %s: %s", document_id, exc)

        logger.info("document recovery finished: %d/%d recovered", recovered, len(stuck))
        return recovered
    except Exception as exc:  # noqa: BLE001
        logger.exception("document recovery sweep failed: %s", exc)
        return 0
