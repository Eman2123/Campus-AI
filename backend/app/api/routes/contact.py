"""Public contact form.

The destination address (settings.CONTACT_EMAIL) stays on the server, so it is
never printed on a page or shipped in the JS bundle where scrapers and spammers
can read it. A hidden "website" field catches simple bots, and the route is
rate limited per IP.
"""
import asyncio
import logging
import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.config import settings
from app.core.email import send_email
from app.core.rate_limit import RateLimitByIP
from app.schemas.auth import MessageOut

logger = logging.getLogger("campus_ai.contact")
router = APIRouter(tags=["contact"])

_TOPIC_LABELS = {
    "general": "General question",
    "privacy": "Privacy / my data",
    "copyright": "Copyright or content complaint",
    "bug": "Bug or problem",
}


class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    topic: Literal["general", "privacy", "copyright", "bug"] = "general"
    message: str = Field(min_length=10, max_length=4000)
    # Honeypot: hidden from people in the form, so only bots fill it in.
    website: str = Field(default="", max_length=200)

    @field_validator("name", "message")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()


def _one_line(value: str) -> str:
    """No CR/LF in anything that ends up in an email header."""
    return re.sub(r"[\r\n]+", " ", value).strip()


@router.post(
    "/contact",
    response_model=MessageOut,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(RateLimitByIP(times=5, seconds=3600))],
)
async def send_contact_message(payload: ContactRequest) -> MessageOut:
    ok = MessageOut(message="Thanks, your message has been sent. We will reply to the email address you gave.")

    if payload.website.strip():
        # A bot. Answer as if it worked so it learns nothing, and send nothing.
        logger.info("contact form: honeypot filled, dropped")
        return ok

    if not settings.CONTACT_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The contact form is not available right now.",
        )

    topic = _TOPIC_LABELS[payload.topic]
    subject = _one_line(f"[Campus AI contact] {topic} from {payload.name}")
    body = (
        f"Topic: {topic}\n"
        f"From: {_one_line(payload.name)} <{payload.email}>\n"
        f"(Reply to this person at {payload.email}.)\n\n"
        f"{payload.message}\n"
    )
    try:
        await asyncio.to_thread(send_email, settings.CONTACT_EMAIL, subject, body)
    except Exception:  # noqa: BLE001 - provider details must not reach the client
        logger.exception("contact form: could not send the message")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We could not send your message right now. Please try again later.",
        ) from None
    return ok
