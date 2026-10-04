import os
import uuid
from pathlib import Path

from app.core.config import settings

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


def _user_upload_dir(user_id: str) -> Path:
    path = Path(settings.UPLOAD_DIR) / user_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def validate_upload(filename: str, size_bytes: int) -> None:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")
    if size_bytes > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File too large ({size_bytes} bytes). Max is {MAX_FILE_SIZE_BYTES} bytes.")


def save_file(user_id: str, filename: str, content: bytes) -> str:
    """Saves the file to disk and returns its storage_path (relative to
    UPLOAD_DIR — stored in the DB, not an absolute path, so moving the
    upload directory or swapping storage backends later doesn't require
    a data migration for existing rows beyond re-pointing the reader).
    """
    validate_upload(filename, len(content))

    ext = os.path.splitext(filename)[1].lower()
    unique_name = f"{uuid.uuid4()}{ext}"
    dest = _user_upload_dir(user_id) / unique_name
    dest.write_bytes(content)

    return f"{user_id}/{unique_name}"


def read_file(storage_path: str) -> bytes:
    full_path = Path(settings.UPLOAD_DIR) / storage_path
    return full_path.read_bytes()


def delete_file(storage_path: str) -> None:
    full_path = Path(settings.UPLOAD_DIR) / storage_path
    full_path.unlink(missing_ok=True)
