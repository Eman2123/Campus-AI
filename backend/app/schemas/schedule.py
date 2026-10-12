import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ScheduleOut(BaseModel):
    id: uuid.UUID
    title: str
    due_date: datetime
    source: str  # "deadline" | "study_session"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
