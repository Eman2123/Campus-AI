import uuid
from datetime import datetime

from pydantic import BaseModel


class SessionOut(BaseModel):
    id: uuid.UUID
    started_at: datetime
    last_message_at: datetime
    preview: str
    message_count: int


class MessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    agent_used: str | None
    created_at: datetime

    class Config:
        from_attributes = True
