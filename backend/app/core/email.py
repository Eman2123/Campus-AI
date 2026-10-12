import logging

import httpx

from app.core.config import settings

logger = logging.getLogger("campus_ai.email")


def send_email(to: str, subject: str, body: str, html: str | None = None) -> None:
    """Sends a transactional email via Resend's REST API.

    `body` is always sent as the plain-text part; `html`, when given, is the
    branded version (see app.core.email_template) that mail clients show
    instead. Keeping both means text-only clients still get a readable email.

    Resend is the concrete provider actually wired up here — same
    "commit to one, document the swap" pattern as AIML for the LLM/embedding
    calls. Switching to SendGrid later means rewriting only this function;
    callers (the Day 20 reminder job, and Day 22's Email Digest job) never
    touch a provider SDK directly.

    Raises whatever httpx raises on a non-2xx response or network failure —
    callers decide how to handle that (the reminder job logs and skips that
    one row rather than failing the whole sweep).
    """
    if not settings.RESEND_API_KEY:
        logger.info("[stub — no RESEND_API_KEY set] would email %s: %r", to, subject)
        return

    payload = {"from": settings.EMAIL_FROM, "to": [to], "subject": subject, "text": body}
    if html:
        payload["html"] = html

    response = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
        json=payload,
        timeout=10.0,
    )
    response.raise_for_status()
