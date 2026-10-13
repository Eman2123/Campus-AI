"""Sign-up name, "remember me", password reset, and Google sign-in.

Same style as the other auth tests: real FastAPI app, real database, real
JWTs. The only things replaced are the outside world — the email provider
and Google's tokeninfo endpoint.
"""
import asyncio
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import pytest

from app.core import google_auth
from app.core.config import settings
from app.core.google_auth import GoogleAuthError, GoogleProfile
from app.core.security import decode_access_token
from tests.helpers import make_admin_headers

# Generated per run so no password literal lives in the repo (secret scanners
# flag hardcoded ones, even in tests).
GOOD_PASSWORD = f"Tp-{secrets.token_urlsafe(12)}"
NEW_PASSWORD = f"Np-{secrets.token_urlsafe(12)}"
FIRST_PASSWORD = f"F1-{secrets.token_urlsafe(12)}"
SECOND_PASSWORD = f"S2-{secrets.token_urlsafe(12)}"


def _email() -> str:
    return f"flow-{uuid.uuid4()}@campus.ai"


def _signup(client, email: str | None = None, **extra):
    email = email or _email()
    resp = client.post("/api/auth/signup", json={"email": email, "password": GOOD_PASSWORD, **extra})
    assert resp.status_code == 201, resp.text
    return email, resp.json()["access_token"]


@pytest.fixture
def outbox(monkeypatch):
    """Captures what the app would have emailed instead of sending it."""
    sent: list[dict] = []

    def fake_send_email(to: str, subject: str, body: str, html: str | None = None) -> None:
        sent.append({"to": to, "subject": subject, "body": body, "html": html})

    monkeypatch.setattr("app.api.routes.auth.send_email", fake_send_email)
    return sent


def _token_from(email_body: str) -> str:
    link = next(word for word in email_body.split() if "/reset-password?token=" in word)
    return parse_qs(urlparse(link).query)["token"][0]


# ---------------------------------------------------------------------------
# Name on sign-up
# ---------------------------------------------------------------------------


def test_signup_saves_name_and_me_returns_it(client):
    _, token = _signup(client, name="  Eman Mirza  ")
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["name"] == "Eman Mirza"


def test_signup_without_name_still_works(client):
    _, token = _signup(client)
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["name"] is None


def test_blank_name_is_stored_as_none(client):
    _, token = _signup(client, name="   ")
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["name"] is None


# ---------------------------------------------------------------------------
# Remember me
# ---------------------------------------------------------------------------


def _lifetime(token: str) -> timedelta:
    exp = datetime.fromtimestamp(decode_access_token(token)["exp"], tz=timezone.utc)
    return exp - datetime.now(timezone.utc)


def test_remember_me_issues_a_longer_lived_token(client):
    email, _ = _signup(client)

    normal = client.post("/api/auth/signin", json={"email": email, "password": GOOD_PASSWORD})
    remembered = client.post(
        "/api/auth/signin", json={"email": email, "password": GOOD_PASSWORD, "remember_me": True}
    )
    assert normal.status_code == 200 and remembered.status_code == 200

    short = _lifetime(normal.json()["access_token"])
    long = _lifetime(remembered.json()["access_token"])
    assert timedelta(hours=23) < short <= timedelta(hours=24)
    assert timedelta(days=settings.REMEMBER_ME_EXPIRE_DAYS - 1) < long <= timedelta(
        days=settings.REMEMBER_ME_EXPIRE_DAYS
    )


# ---------------------------------------------------------------------------
# Forgot password / reset password
# ---------------------------------------------------------------------------


def test_forgot_password_answers_the_same_for_unknown_emails(client, outbox):
    known, _ = _signup(client)

    for_known = client.post("/api/auth/forgot-password", json={"email": known})
    for_unknown = client.post("/api/auth/forgot-password", json={"email": _email()})

    assert for_known.status_code == for_unknown.status_code == 200
    assert for_known.json() == for_unknown.json()  # no way to tell them apart
    assert [m["to"] for m in outbox] == [known]  # ...but only the real one got mail


def test_forgot_password_email_contains_a_working_link(client, outbox):
    email, _ = _signup(client, name="Eman")
    client.post("/api/auth/forgot-password", json={"email": email})

    assert len(outbox) == 1
    body = outbox[0]["body"]
    assert body.startswith("Hi Eman,")
    assert f"{settings.FRONTEND_URL}/reset-password?token=" in body


def test_reset_password_full_flow(client, outbox):
    email, _ = _signup(client)
    client.post("/api/auth/forgot-password", json={"email": email})
    token = _token_from(outbox[0]["body"])

    reset = client.post("/api/auth/reset-password", json={"token": token, "password": NEW_PASSWORD})
    assert reset.status_code == 200, reset.text

    old = client.post("/api/auth/signin", json={"email": email, "password": GOOD_PASSWORD})
    new = client.post("/api/auth/signin", json={"email": email, "password": NEW_PASSWORD})
    assert old.status_code == 401
    assert new.status_code == 200


def test_reset_link_works_only_once(client, outbox):
    email, _ = _signup(client)
    client.post("/api/auth/forgot-password", json={"email": email})
    token = _token_from(outbox[0]["body"])

    first = client.post("/api/auth/reset-password", json={"token": token, "password": FIRST_PASSWORD})
    second = client.post("/api/auth/reset-password", json={"token": token, "password": SECOND_PASSWORD})
    assert first.status_code == 200
    assert second.status_code == 400

    # ...and the second attempt must not have changed the password.
    still_first = client.post("/api/auth/signin", json={"email": email, "password": FIRST_PASSWORD})
    assert still_first.status_code == 200


def test_requesting_a_new_link_retires_the_old_one(client, outbox):
    email, _ = _signup(client)
    client.post("/api/auth/forgot-password", json={"email": email})
    client.post("/api/auth/forgot-password", json={"email": email})
    old_token, new_token = (_token_from(m["body"]) for m in outbox)

    stale = client.post("/api/auth/reset-password", json={"token": old_token, "password": NEW_PASSWORD})
    fresh = client.post("/api/auth/reset-password", json={"token": new_token, "password": NEW_PASSWORD})
    assert stale.status_code == 400
    assert fresh.status_code == 200


def test_expired_reset_link_is_rejected(client, outbox):
    email, _ = _signup(client)
    with patch.object(settings, "PASSWORD_RESET_EXPIRE_MINUTES", -1):  # already expired when issued
        client.post("/api/auth/forgot-password", json={"email": email})
    token = _token_from(outbox[0]["body"])

    resp = client.post("/api/auth/reset-password", json={"token": token, "password": NEW_PASSWORD})
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"]


def test_made_up_reset_token_is_rejected(client):
    resp = client.post(
        "/api/auth/reset-password", json={"token": "x" * 43, "password": NEW_PASSWORD}
    )
    assert resp.status_code == 400


def test_reset_password_enforces_the_same_length_rule_as_signup(client):
    resp = client.post("/api/auth/reset-password", json={"token": "x" * 43, "password": "short"})
    assert resp.status_code == 422


def test_forgot_password_is_rate_limited(client, outbox):
    email, _ = _signup(client)
    statuses = [client.post("/api/auth/forgot-password", json={"email": email}).status_code for _ in range(6)]
    assert statuses[:5] == [200] * 5
    assert statuses[5] == 429


def test_disabled_account_gets_no_reset_email_and_cannot_use_an_old_link(client, outbox):
    admin_headers = make_admin_headers(client, _email())

    student_email, student_token = _signup(client)
    student_id = client.get("/api/auth/me", headers={"Authorization": f"Bearer {student_token}"}).json()["id"]

    client.post("/api/auth/forgot-password", json={"email": student_email})
    link_token = _token_from(outbox[0]["body"])

    assert client.post(f"/api/admin/users/{student_id}/disable", headers=admin_headers).status_code == 200

    outbox.clear()
    client.post("/api/auth/forgot-password", json={"email": student_email})
    assert outbox == []  # nothing sent to a disabled account
    reset = client.post("/api/auth/reset-password", json={"token": link_token, "password": NEW_PASSWORD})
    assert reset.status_code == 400  # a link issued before disabling no longer works


# ---------------------------------------------------------------------------
# Google sign-in
# ---------------------------------------------------------------------------


def _fake_google(profile: GoogleProfile | None = None, error: str | None = None):
    async def fake_verify(credential: str) -> GoogleProfile:
        if error:
            raise GoogleAuthError(error)
        return profile

    return patch("app.api.routes.auth.verify_google_id_token", fake_verify)


def test_google_sign_in_is_off_until_configured(client):
    with patch.object(settings, "GOOGLE_CLIENT_ID", ""):
        resp = client.post("/api/auth/google", json={"credential": "a" * 40})
    assert resp.status_code == 503


def test_google_sign_in_creates_then_reuses_the_account(client):
    email = _email()
    profile = GoogleProfile(email=email, name="Eman Mirza")
    with patch.object(settings, "GOOGLE_CLIENT_ID", "client-id"), _fake_google(profile):
        first = client.post("/api/auth/google", json={"credential": "a" * 40})
        second = client.post("/api/auth/google", json={"credential": "a" * 40})
    assert first.status_code == second.status_code == 200

    me_1 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {first.json()['access_token']}"}).json()
    me_2 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {second.json()['access_token']}"}).json()
    assert me_1["email"] == email
    assert me_1["name"] == "Eman Mirza"
    assert me_1["id"] == me_2["id"]  # same person, not a duplicate account


def test_google_sign_in_signs_into_an_existing_password_account(client):
    email, password_token = _signup(client, name="Original Name")
    with patch.object(settings, "GOOGLE_CLIENT_ID", "client-id"), _fake_google(
        GoogleProfile(email=email.upper(), name="Different Name")  # Google may differ in case
    ):
        resp = client.post("/api/auth/google", json={"credential": "a" * 40})
    assert resp.status_code == 200

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {resp.json()['access_token']}"}).json()
    assert me["email"] == email  # matched the existing account...
    assert me["name"] == "Original Name"  # ...and left its profile alone


def test_google_sign_in_rejects_a_bad_credential(client):
    with patch.object(settings, "GOOGLE_CLIENT_ID", "client-id"), _fake_google(error="Google sign-in could not be verified."):
        resp = client.post("/api/auth/google", json={"credential": "a" * 40})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Google sign-in could not be verified."


def test_google_sign_in_respects_disabled_accounts(client):
    admin_headers = make_admin_headers(client, _email())
    student_email, student_token = _signup(client)
    student_id = client.get("/api/auth/me", headers={"Authorization": f"Bearer {student_token}"}).json()["id"]
    client.post(f"/api/admin/users/{student_id}/disable", headers=admin_headers)

    with patch.object(settings, "GOOGLE_CLIENT_ID", "client-id"), _fake_google(
        GoogleProfile(email=student_email, name=None)
    ):
        resp = client.post("/api/auth/google", json={"credential": "a" * 40})
    assert resp.status_code == 403


# --- the verifier itself, with Google's HTTP answer faked -------------------


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def json(self) -> dict:
        return self._payload


def _verify_with(monkeypatch, status_code: int, claims: dict) -> GoogleProfile:
    class FakeClient:
        def __init__(self, *args, **kwargs): ...
        async def __aenter__(self): return self
        async def __aexit__(self, *exc): return False
        async def get(self, url, params=None):
            return _FakeResponse(status_code, claims)

    monkeypatch.setattr(google_auth.httpx, "AsyncClient", FakeClient)
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "client-id")
    return asyncio.run(google_auth.verify_google_id_token("credential"))


GOOD_CLAIMS = {
    "aud": "client-id",
    "iss": "https://accounts.google.com",
    "email": "student@uni.edu",
    "email_verified": "true",
    "name": "Student",
}


def test_verifier_accepts_a_valid_token(monkeypatch):
    profile = _verify_with(monkeypatch, 200, GOOD_CLAIMS)
    assert profile == GoogleProfile(email="student@uni.edu", name="Student")


@pytest.mark.parametrize(
    "override",
    [
        {"aud": "someone-elses-client-id"},  # token minted for a different app
        {"iss": "https://evil.example"},
        {"email_verified": "false"},
        {"email": ""},
    ],
)
def test_verifier_rejects_tokens_that_are_not_ours_or_not_verified(monkeypatch, override):
    with pytest.raises(GoogleAuthError):
        _verify_with(monkeypatch, 200, {**GOOD_CLAIMS, **override})


def test_verifier_rejects_a_token_google_itself_refuses(monkeypatch):
    with pytest.raises(GoogleAuthError):
        _verify_with(monkeypatch, 400, {"error": "invalid_token"})


# ---------------------------------------------------------------------------
# Fix 7 — a password reset revokes tokens issued before it
# ---------------------------------------------------------------------------


def test_password_reset_revokes_existing_tokens(client, outbox):
    email, old_token = _signup(client)
    old_headers = {"Authorization": f"Bearer {old_token}"}
    assert client.get("/api/auth/me", headers=old_headers).status_code == 200

    client.post("/api/auth/forgot-password", json={"email": email})
    reset = client.post("/api/auth/reset-password", json={"token": _token_from(outbox[0]["body"]), "password": NEW_PASSWORD})
    assert reset.status_code == 200

    # The token someone may have stolen before the reset is dead...
    assert client.get("/api/auth/me", headers=old_headers).status_code == 401
    # ...while signing in again with the new password works and yields a live token.
    signin = client.post("/api/auth/signin", json={"email": email, "password": NEW_PASSWORD})
    assert signin.status_code == 200
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {signin.json()['access_token']}"}).status_code == 200


def test_tokens_carry_the_version_and_a_missing_claim_counts_as_zero(client):
    from app.core.security import create_access_token

    _, token = _signup(client)
    assert decode_access_token(token)["tv"] == 0

    user_id = decode_access_token(token)["sub"]
    legacy = create_access_token(subject=user_id)  # issued before the claim existed
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {legacy}"}).status_code == 200


def test_a_token_from_the_wrong_version_is_rejected(client):
    from app.core.security import create_access_token

    _, token = _signup(client)
    user_id = decode_access_token(token)["sub"]
    stale = create_access_token(subject=user_id, extra_claims={"tv": 5})
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {stale}"}).status_code == 401
