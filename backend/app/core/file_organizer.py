import asyncio
import logging

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.google_drive import organize_file_in_drive
from app.core.storage import read_file
from app.core.subject_classifier import classify_subject
from app.core.text_extraction import extract_text
from app.models.document import Document

logger = logging.getLogger("campus_ai.file_organizer")

EXCERPT_CHARS = 1500


async def organize_document(document_id: str) -> None:
    """Runs as a FastAPI BackgroundTask right after upload, alongside Day
    17's process_document — the File Organizer connector. Classifies the
    document into a subject/tag and, when a Drive service account is
    configured, files a copy into that subject's folder there.

    Has its own DB session for the same reason process_document does:
    the request's session is long closed by the time a background task
    actually runs. FastAPI runs background tasks in the order they were
    added, not concurrently, so this and process_document never race on
    the same document row.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document).where(Document.id == document_id))
        document = result.scalar_one_or_none()
        if document is None:
            logger.error("organize_document: document %s not found", document_id)
            return

        document.organize_status = "processing"
        await db.commit()

        try:
            content = read_file(document.storage_path)
            text = extract_text(content, document.filename)
            excerpt = text[:EXCERPT_CHARS]

            subject = await asyncio.to_thread(classify_subject, document.filename, excerpt)
            document.subject = subject

            drive_result = await asyncio.to_thread(
                organize_file_in_drive, str(document.user_id), subject, document.filename, content
            )
            if drive_result is not None:
                document.drive_file_id = drive_result["drive_file_id"]
                document.drive_folder_path = drive_result["drive_folder_path"]
                document.organize_status = "organized"
            else:
                # No Drive service account configured — the subject tag
                # above still landed, just nothing got filed anywhere.
                document.organize_status = "skipped"

            await db.commit()
            logger.info(
                "document %s organized: subject=%s status=%s", document_id, subject, document.organize_status
            )

        except Exception as exc:
            logger.exception("document %s organizing failed: %s", document_id, exc)
            document.organize_status = "failed"
            await db.commit()
