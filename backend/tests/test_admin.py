"""Day 34 — admin auth/role-gating.

ADMIN_EMAILS is empty by default in test environments, so each test that
needs an admin patches it to a specific email before signing that user
up (or back in), exercising the real bootstrap path rather than poking
the role directly in the DB. Admin promotion only happens on Google sign-in
(verified email), never on password signup/signin.
"""
import uuid
from unittest.mock import patch

from app.core.config import settings
from app.core.google_auth import GoogleProfile


def test_admin_ping_rejects_non_admin(client, auth_headers):
    resp = client.get("/api/admin/ping", headers=auth_headers)
    assert resp.status_code == 403


def test_admin_ping_requires_auth(client):
    resp = client.get("/api/admin/ping")
    # HTTPBearer(auto_error=True) (the default, used by get_current_user)
    # returns 403 for a completely missing Authorization header — same
    # finding as Day 30's streaming-endpoint auth test.
    assert resp.status_code == 403




def _google_login(client, email: str):
    """Signs in through the Google route with a mocked, verified identity."""

    async def fake_verify(credential: str) -> GoogleProfile:
        return GoogleProfile(email=email, name="Admin Person")

    with patch.object(settings, "GOOGLE_CLIENT_ID", "test-client"), patch(
        "app.api.routes.auth.verify_google_id_token", fake_verify
    ):
        return client.post("/api/auth/google", json={"credential": "a" * 40})


def test_password_signup_never_promotes_to_admin(client):
    """Anyone can register a listed address with a password, so that must NOT
    grant admin (the takeover this test guards against)."""
    email = f"admin-{uuid.uuid4()}@campus.ai"
    with patch.object(settings, "ADMIN_EMAILS", [email]):
        signup_resp = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
        assert signup_resp.status_code == 201
        headers = {"Authorization": f"Bearer {signup_resp.json()['access_token']}"}

        assert client.get("/api/auth/me", headers=headers).json()["role"] == "student"
        assert client.get("/api/admin/ping", headers=headers).status_code == 403


def test_password_signin_never_promotes_to_admin(client):
    email = f"pw-admin-{uuid.uuid4()}@campus.ai"
    client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
    with patch.object(settings, "ADMIN_EMAILS", [email]):
        signin = client.post("/api/auth/signin", json={"email": email, "password": "testpass123"})
        assert signin.status_code == 200
        headers = {"Authorization": f"Bearer {signin.json()['access_token']}"}
        assert client.get("/api/admin/ping", headers=headers).status_code == 403


def test_google_signin_promotes_listed_email_to_admin(client):
    email = f"google-admin-{uuid.uuid4()}@campus.ai"
    with patch.object(settings, "ADMIN_EMAILS", [email]):
        resp = _google_login(client, email)
        assert resp.status_code == 200
        headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
        assert client.get("/api/auth/me", headers=headers).json()["role"] == "admin"
        ping = client.get("/api/admin/ping", headers=headers)
        assert ping.status_code == 200
        assert ping.json() == {"status": "ok", "role": "admin"}


def test_google_signin_promotes_an_existing_account_retroactively(client):
    """An account that already exists (made with a password, still a student)
    is promoted the next time its owner signs in with Google."""
    email = f"retro-admin-{uuid.uuid4()}@campus.ai"
    signup = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
    first_headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}
    assert client.get("/api/admin/ping", headers=first_headers).status_code == 403

    with patch.object(settings, "ADMIN_EMAILS", [email]):
        assert _google_login(client, email).status_code == 200
        # The role lives in the DB (get_current_user re-reads it), so the
        # original token sees the promotion too.
        assert client.get("/api/admin/ping", headers=first_headers).status_code == 200


def test_admin_bootstrap_is_case_insensitive_on_email(client):
    email = f"CaseTest-{uuid.uuid4()}@campus.ai"
    with patch.object(settings, "ADMIN_EMAILS", [email.lower()]):
        resp = _google_login(client, email)
        assert resp.status_code == 200
        headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
        assert client.get("/api/admin/ping", headers=headers).status_code == 200
