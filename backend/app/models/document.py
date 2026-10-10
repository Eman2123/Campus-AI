import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    embedding_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # "pending" | "processing" | "ready" | "failed" — Day 17 chunking pipeline updates this

    # File Organizer connector (Day 23) — auto-classified subject/tag and,
    # if a Drive service account is configured, where the filed copy ended
    # up. organize_status: "pending" | "processing" | "organized" |
    # "skipped" (no Drive credentials configured — subject is still set) |
    # "failed".
    subject: Mapped[str | None] = mapped_column(String(100), nullable=True)
    drive_file_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    drive_folder_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    organize_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship()
