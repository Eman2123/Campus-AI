from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.core.config import settings


class Preferences(BaseModel):
    """Everything on the Settings page that is a personal choice. Defaults
    live here (not in the database) so users who never opened Settings
    behave exactly as before."""

    reminders_enabled: bool = True
    remind_hours: int = Field(default=settings.REMINDER_LEAD_TIME_HOURS, ge=1, le=168)
    digest_enabled: bool = True
    digest_days: int = Field(default=settings.DIGEST_LOOKAHEAD_DAYS, ge=1, le=30)
    drive_upload: bool = True
    week_starts_on: Literal["Monday", "Sunday"] = "Monday"
    reduce_motion: bool = False
    typewriter: bool = True
    voice_input: bool = True


class PreferencesUpdate(BaseModel):
    """PATCH body: send only what changed."""

    reminders_enabled: bool | None = None
    remind_hours: int | None = Field(default=None, ge=1, le=168)
    digest_enabled: bool | None = None
    digest_days: int | None = Field(default=None, ge=1, le=30)
    drive_upload: bool | None = None
    week_starts_on: Literal["Monday", "Sunday"] | None = None
    reduce_motion: bool | None = None
    typewriter: bool | None = None
    voice_input: bool | None = None


class NameUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class DeleteAccountRequest(BaseModel):
    # Typing your own email is the confirmation, so a stray API call (or a
    # stolen-but-unaware click) can't wipe an account by accident.
    confirm_email: EmailStr
