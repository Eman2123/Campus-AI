import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Always stored lowercase (see schemas.auth.normalize_email); a unique
    # index on lower(email) (migration e2f6a4c9d1b3) enforces it in the database.
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    # Display name from the sign-up form (or the Google profile). Optional:
    # accounts created before this column existed simply have none.
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="student")  # "student" | "admin"
    # Day 35 — admin "disable" action. Checked in get_current_user (Day 5)
    # so a disabled user's existing token stops working immediately, the
    # same way a role change (Day 34) takes effect immediately — both
    # rely on get_current_user re-reading the row from the DB on every
    # request rather than trusting anything baked into the JWT.
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Settings-page choices (reminder lead time, digest window, week start,
    # ...). Stored sparse: only keys the student has changed. Defaults are
    # applied by app.schemas.preferences.Preferences, so a new setting never
    # needs a data migration.
    # Bumped to revoke every token issued before now (password reset, Google
    # sign-in taking over a pre-registered account). Tokens carry it as the
    # "tv" claim and get_current_user rejects a mismatch.
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    # Set the first time this account was verified through Google sign-in
    # (which proves the person owns the email address). Until then a password
    # on the account proves nothing: anyone could have pre-registered the
    # address. See google_sign_in.
    google_linked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    preferences: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    sessions: Mapped[list["Session"]] = relationship(back_populates="user", cascade="all, delete-orphan")
