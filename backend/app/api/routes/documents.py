import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.file_organizer import organize_document
from app.core.google_drive import delete_file_from_drive
from app.core.rag_pipeline import process_document
from app.core.storage import delete_file, save_file
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentOut

router = APIRouter()
logger = logging.getLogger("campus_ai.documents")


@router.post("/documents/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()

    try:
        storage_path = save_file(str(current_user.id), file.filename, content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    document = Document(
        user_id=current_user.id,
        filename=file.filename,
        storage_path=storage_path,
        embedding_status="pending",
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    logger.info("document uploaded: user=%s filename=%s id=%s", current_user.id, file.filename, document.id)

    # Chunking + embedding (Day 17) and File Organizer classification +
    # Drive filing (Day 23) both happen after the response is sent —
    # upload stays fast, embedding_status/organize_status track progress
    # for polling.
    background_tasks.add_task(process_document, str(document.id))
    background_tasks.add_task(organize_document, str(document.id))

    return document


@router.get("/documents", response_model=list[DocumentOut])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.user_id == current_user.id).order_by(Document.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    delete_file(document.storage_path)
    if document.drive_file_id:
        delete_file_from_drive(document.drive_file_id)  # best-effort, never raises — see google_drive.py
    await db.delete(document)
    await db.commit()
