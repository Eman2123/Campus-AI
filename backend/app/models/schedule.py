import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # "deadline" — the exam/assignment date itself, as stated by the student.
    # "study_session" — one of the backward-planned review sessions the
    # Planner Agent generated leading up to it (Day 19). Day 20's ICS
    # export and reminder job read rows of both kinds from this table.
    source: Mapped[str] = mapped_column(String(30), nullable=False)
    # Set once a reminder email has actually been sent for this row (Day 20)
    # — stays NULL until then, which is also how the reminder job finds
    # rows it hasn't handled yet. Only meaningful for source="deadline";
    # study sessions aren't reminded about individually.
    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship()
