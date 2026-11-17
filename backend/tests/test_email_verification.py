"""Email verification: a password account must prove it owns its address.

Real FastAPI app, real database, real JWTs; only the email provider is
replaced (the outbox fixture captures what would have been sent).
"""
import asyncio
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import pytest
from sqlalchemy import select, update

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.google_auth import GoogleProfile
from app.models.email_verification_token import EmailVerificationToken
from app.models.user import User

PASSWORD = f"Vp-{secrets.token_urlsafe(12)}"
OTHER_PASSWORD = f"Op-{secrets.token_urlsafe(12)}"


@pytest.fixture(autouse=True)
def verification_on(monkeypatch):
    monkeypatch.setattr(settings, "REQUIRE_EMAIL_VERIFICATION", True)


@pytest.fixture
def outbox(monkeypatch):
    sent: list[dict] = []

    def fake_send_email(to: str, subject: str, body: str, html: str | None = None) -> None:
        sent.append({"to": to, "subject": subject, "body": body, "html": html})

    monkeypatch.setattr("app.api.routes.auth.send_email", fake_send_email)
    return sent


def _email() -> str:
    return f"verify-{uuid.uuid4()}@campus.ai"


def _signup(client, email: str, password: str = PASSWORD):
    return client.post("/api/auth/signup", json={"email": email, "password": password})


def _signin(client, email: str, password: str = PASSWORD):
    return client.post("/api/auth/signin", json={"email": email, "password": password})


def _token_from(body: str) -> str:
    link = next(word for word in body.split() if "/verify-email?token=" in word)
    return parse_qs(urlparse(link).query)["token"][0]


async def _user(email: str) -> User:
    async with AsyncSessionLocal() as db:
        return (await db.execute(select(User).where(User.email == email))).scalar_one()


async def _age_tokens(email: str, seconds: int) -> None:
    """Pretend the last verification email was sent `seconds` ago."""
    async with AsyncSessionLocal() as db:
        user_id = (await db.execute(select(User.id).where(User.email == email))).scalar_one()
        await db.execute(
            update(EmailVerificationToken)
            .where(EmailVerificationToken.user_id == user_id)
            .values(created_at=datetime.now(timezone.utc) - timedelta(seconds=seconds))
        )
        await db.commit()


async def _expire_tokens(email: str) -> None:
    async with AsyncSessionLocal() as db:
        user_id = (await db.execute(select(User.id).where(User.email == email))).scalar_one()
        await db.execute(
            update(EmailVerificationToken)
            .where(EmailVerificationToken.user_id == user_id)
            .values(expires_at=datetime.now(timezone.utc) - timedelta(minutes=1))
        )
        await db.commit()


def test_signup_sends_link_and_returns_no_token(client, outbox):
    email = _email()
    resp = _signup(client, email)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["verification_required"] is True
    assert data["access_token"] is None
    assert len(outbox) == 1 and outbox[0]["to"] == email
    assert "/verify-email?token=" in outbox[0]["body"]


def test_cannot_sign_in_before_confirming(client, outbox):
    email = _email()
    _signup(client, email)
    resp = _signin(client, email)
    assert resp.status_code == 403
    assert "confirm your email" in resp.json()["detail"].lower()


def test_wrong_password_is_still_a_plain_401_for_unverified_accounts(client, outbox):
    email = _email()
    _signup(client, email)
    resp = _signin(client, email, "definitely-wrong-password")
    assert resp.status_code == 401


def test_clicking_the_link_confirms_and_sign_in_then_works(client, outbox):
    email = _email()
    _signup(client, email)
    token = _token_from(outbox[0]["body"])

    verified = client.post("/api/auth/verify-email", json={"token": token})
    assert verified.status_code == 200, verified.text

    resp = _signin(client, email)
    assert resp.status_code == 200, resp.text
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {resp.json()['access_token']}"})
    assert me.json()["email"] == email
    assert client.portal.call(_user, email).email_verified_at is not None


def test_link_works_only_once(client, outbox):
    email = _email()
    _signup(client, email)
    token = _token_from(outbox[0]["body"])
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 200
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 400


def test_expired_or_made_up_links_are_rejected(client, outbox):
    email = _email()
    _signup(client, email)
    token = _token_from(outbox[0]["body"])
    client.portal.call(_expire_tokens, email)
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 400
    assert client.post("/api/auth/verify-email", json={"token": "x" * 43}).status_code == 400
    assert _signin(client, email).status_code == 403


def test_resend_gives_a_new_link_and_retires_the_old_one(client, outbox):
    email = _email()
    _signup(client, email)
    first = _token_from(outbox[0]["body"])
    client.portal.call(_age_tokens, email, 120)  # past the cooldown

    resp = client.post("/api/auth/resend-verification", json={"email": email})
    assert resp.status_code == 200
    assert len(outbox) == 2
    second = _token_from(outbox[1]["body"])
    assert first != second

    assert client.post("/api/auth/verify-email", json={"token": first}).status_code == 400
    assert client.post("/api/auth/verify-email", json={"token": second}).status_code == 200


def test_resend_respects_the_cooldown(client, outbox):
    email = _email()
    _signup(client, email)
    client.post("/api/auth/resend-verification", json={"email": email})
    client.post("/api/auth/resend-verification", json={"email": email})
    assert len(outbox) == 1  # only the sign-up email; both resends were too soon


def test_resend_does_not_reveal_who_is_registered(client, outbox):
    unknown = client.post("/api/auth/resend-verification", json={"email": _email()})
    email = _email()
    _signup(client, email)
    known = client.post("/api/auth/resend-verification", json={"email": email})
    assert unknown.status_code == known.status_code == 200
    assert unknown.json() == known.json()


def test_resend_sends_nothing_once_confirmed(client, outbox):
    email = _email()
    _signup(client, email)
    client.post("/api/auth/verify-email", json={"token": _token_from(outbox[0]["body"])})
    client.post("/api/auth/resend-verification", json={"email": email})
    assert len(outbox) == 1


def test_unconfirmed_address_can_be_claimed_by_its_real_owner(client, outbox):
    """A stranger registers someone else's address first. The real owner signs
    up with it: the stranger's password stops working and only the owner's
    inbox can finish the account."""
    email = _email()
    _signup(client, email, OTHER_PASSWORD)  # the squatter
    assert _signup(client, email, PASSWORD).status_code == 201  # the real owner
    assert len(outbox) == 2

    client.post("/api/auth/verify-email", json={"token": _token_from(outbox[1]["body"])})
    assert _signin(client, email, PASSWORD).status_code == 200
    assert _signin(client, email, OTHER_PASSWORD).status_code == 401


def test_confirmed_address_cannot_be_signed_up_again(client, outbox):
    email = _email()
    _signup(client, email)
    client.post("/api/auth/verify-email", json={"token": _token_from(outbox[0]["body"])})
    assert _signup(client, email, OTHER_PASSWORD).status_code == 409


def test_password_reset_also_confirms_the_address(client, outbox):
    email = _email()
    _signup(client, email)
    client.post("/api/auth/forgot-password", json={"email": email})
    reset_mail = next(m for m in outbox if "/reset-password?token=" in m["body"])
    link = next(w for w in reset_mail["body"].split() if "/reset-password?token=" in w)
    token = parse_qs(urlparse(link).query)["token"][0]

    assert client.post("/api/auth/reset-password", json={"token": token, "password": OTHER_PASSWORD}).status_code == 200
    assert _signin(client, email, OTHER_PASSWORD).status_code == 200


def test_google_sign_in_counts_as_confirmed(client, outbox):
    email = _email()

    async def fake_verify(credential: str) -> GoogleProfile:
        return GoogleProfile(email=email, name="G User")

    with patch.object(settings, "GOOGLE_CLIENT_ID", "test-client"), patch(
        "app.api.routes.auth.verify_google_id_token", fake_verify
    ):
        resp = client.post("/api/auth/google", json={"credential": "a" * 40})
    assert resp.status_code == 200, resp.text
    assert client.portal.call(_user, email).email_verified_at is not None


def test_with_verification_off_signup_signs_in_directly(client, monkeypatch):
    monkeypatch.setattr(settings, "REQUIRE_EMAIL_VERIFICATION", False)
    resp = _signup(client, _email())
    assert resp.status_code == 201
    data = resp.json()
    assert data["verification_required"] is False and data["access_token"]
