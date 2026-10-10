import uuid
from datetime import datetime

from pydantic import BaseModel


class ScheduleOut(BaseModel):
    id: uuid.UUID
    title: str
    due_date: datetime
    source: str  # "deadline" | "study_session"
    created_at: datetime

    class Config:
        from_attributes = True
