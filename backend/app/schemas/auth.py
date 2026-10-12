import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    # Optional so existing API clients (and the test suite's signup
    # fixture) keep working unchanged.
    name: str | None = Field(default=None, max_length=100)

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


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str | None = None
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    password: str = Field(min_length=8, max_length=128)


class GoogleAuthRequest(BaseModel):
    # The "credential" string Google Identity Services hands the browser.
    credential: str = Field(min_length=10, max_length=4096)


class MessageOut(BaseModel):
    message: str
