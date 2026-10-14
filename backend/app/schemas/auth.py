import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


def normalize_email(value):
    """Emails are case-insensitive for our purposes: pydantic's EmailStr keeps
    the local part as typed, so "Eman@x.com" and "eman@x.com" would otherwise
    be two accounts and sign-in would fail on a different case."""
    return value.strip().lower() if isinstance(value, str) else value


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    # Optional so existing API clients (and the test suite's signup
    # fixture) keep working unchanged.
    name: str | None = Field(default=None, max_length=100)
    # True when the person ticked "I agree to the Terms and Privacy policy".
    # Optional so API clients and the test suite keep working; when true the
    # time and version of the text are stored (see app.core.legal).
    accept_terms: bool = False

    _normalize_email = field_validator("email", mode="before")(normalize_email)

    @field_validator("name")
    @classmethod
    def _blank_name_is_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

    _normalize_email = field_validator("email", mode="before")(normalize_email)


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str | None = None
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    _normalize_email = field_validator("email", mode="before")(normalize_email)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    password: str = Field(min_length=8, max_length=128)


class GoogleAuthRequest(BaseModel):
    # The "credential" string Google Identity Services hands the browser.
    credential: str = Field(min_length=10, max_length=4096)
    # Same meaning as UserCreate.accept_terms; only used if this creates a new account.
    accept_terms: bool = False


class MessageOut(BaseModel):
    message: str
