"""Contact form (keeps the owner's address server-side), recorded consent at
sign-up, and the retention purge."""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.legal import TERMS_VERSION
from app.core.retention import purge_expired_data
from app.models.agent_call_log import AgentCallLog
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User

GOOD = {"name": "Ada", "email": "ada@uni.edu", "topic": "privacy", "message": "Please send me a copy of my data."}


# ---------------------------------------------------------------- contact ----
def test_contact_sends_to_the_private_address_and_never_returns_it(client, monkeypatch):
    monkeypatch.setattr(settings, "CONTACT_EMAIL", "owner-private@example.com")
    with patch("app.api.routes.contact.send_email") as send:
        resp = client.post("/api/contact", json=GOOD)
    assert resp.status_code == 202
    assert "owner-private@example.com" not in resp.text
    to, subject, body = send.call_args.args
    assert to == "owner-private@example.com"
    assert "Privacy" in subject and "ada@uni.edu" in body and "copy of my data" in body


def test_contact_honeypot_is_dropped_silently(client, monkeypatch):
    monkeypatch.setattr(settings, "CONTACT_EMAIL", "owner-private@example.com")
    with patch("app.api.routes.contact.send_email") as send:
        resp = client.post("/api/contact", json={**GOOD, "website": "http://spam.example"})
    assert resp.status_code == 202
    send.assert_not_called()


def test_contact_is_unavailable_when_no_destination_is_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "CONTACT_EMAIL", "")
    resp = client.post("/api/contact", json=GOOD)
    assert resp.status_code == 503


def test_contact_validates_input_and_blocks_header_injection(client, monkeypatch):
    monkeypatch.setattr(settings, "CONTACT_EMAIL", "owner-private@example.com")
    assert client.post("/api/contact", json={**GOOD, "message": "short"}).status_code == 422
    assert client.post("/api/contact", json={**GOOD, "email": "not-an-email"}).status_code == 422
    with patch("app.api.routes.contact.send_email") as send:
        resp = client.post("/api/contact", json={**GOOD, "name": "Ada\r\nBcc: evil@example.com"})
    assert resp.status_code == 202
    subject = send.call_args.args[1]
    assert "\r" not in subject and "\n" not in subject


def test_contact_provider_failure_is_a_clean_502(client, monkeypatch):
    monkeypatch.setattr(settings, "CONTACT_EMAIL", "owner-private@example.com")
    with patch("app.api.routes.contact.send_email", side_effect=RuntimeError("resend key sk_live_secret")):
        resp = client.post("/api/contact", json=GOOD)
    assert resp.status_code == 502
    assert "sk_live_secret" not in resp.text


def test_contact_is_rate_limited(client, monkeypatch):
    monkeypatch.setattr(settings, "CONTACT_EMAIL", "owner-private@example.com")
    with patch("app.api.routes.contact.send_email"):
        codes = [client.post("/api/contact", json=GOOD).status_code for _ in range(6)]
    assert codes[:5] == [202] * 5 and codes[5] == 429


# ----------------------------------------------------------------- consent ---
def _signup(client, **extra):
    email = f"consent-{uuid.uuid4().hex[:8]}@example.com"
    resp = client.post("/api/auth/signup", json={"email": email, "password": "password-123", **extra})
    assert resp.status_code == 201, resp.text
    return email, {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _user(email):
    async with AsyncSessionLocal() as db:
        return (await db.execute(select(User).where(User.email == email))).scalar_one()


def test_signup_records_acceptance_of_the_terms(client):
    email, headers = _signup(client, accept_terms=True)
    user = client.portal.call(_user, email)
    assert user.terms_version == TERMS_VERSION
    assert user.terms_accepted_at is not None
    exported = client.get("/api/auth/me/export", headers=headers).json()
    assert exported["account"]["terms_version"] == TERMS_VERSION


def test_signup_without_the_flag_records_nothing(client):
    email, _ = _signup(client)
    user = client.portal.call(_user, email)
    assert user.terms_accepted_at is None and user.terms_version is None


# --------------------------------------------------------------- retention ---
async def _seed_and_purge():
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        old = AgentCallLog(agent_name="retention-old", intent="x", duration_ms=1.0, success=True,
                           created_at=now - timedelta(days=settings.LOG_RETENTION_DAYS + 1))
        new = AgentCallLog(agent_name="retention-new", intent="x", duration_ms=1.0, success=True, created_at=now)
        db.add_all([old, new])
        await db.commit()
    result = await purge_expired_data()
    async with AsyncSessionLocal() as db:
        names = set((await db.execute(select(AgentCallLog.agent_name).where(AgentCallLog.agent_name.like("retention-%")))).scalars())
        await db.execute(AgentCallLog.__table__.delete().where(AgentCallLog.agent_name == "retention-new"))
        await db.commit()
    return result, names


def test_purge_deletes_only_statistics_older_than_the_retention_period(client):
    result, remaining = client.portal.call(_seed_and_purge)
    assert remaining == {"retention-new"}
    assert result["agent_call_logs"] >= 1
