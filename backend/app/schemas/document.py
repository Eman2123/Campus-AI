import uuid
from datetime import datetime

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: uuid.UUID
    filename: str
    embedding_status: str
    subject: str | None = None
    drive_file_id: str | None = None
    drive_folder_path: str | None = None
    organize_status: str
    created_at: datetime

    class Config:
        from_attributes = True
