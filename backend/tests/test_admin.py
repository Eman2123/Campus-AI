"""Day 34 — admin auth/role-gating.

ADMIN_EMAILS is empty by default in test environments, so each test that
needs an admin patches it to a specific email before signing that user
in, exercising the real bootstrap path rather than poking the role
directly in the DB.

Admin promotion happens ONLY on the Google sign-in path (Google verifies
the email). Password signup/signin never promote: nothing there proves
the person owns the address, so honouring ADMIN_EMAILS would let anyone
register an admin's email first and take over.
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
    # A completely missing Authorization header is 401 Unauthorized (newer
    # FastAPI; older releases answered 403). 403 is reserved for "signed in
    # but not an admin" — see the other tests in this file.
    assert resp.status_code == 401


def _google(profile: GoogleProfile):
    async def fake_verify(credential: str) -> GoogleProfile:
        return profile

    return patch("app.api.routes.auth.verify_google_id_token", fake_verify)


def _google_signin(client, email: str):
    with patch.object(settings, "GOOGLE_CLIENT_ID", "client-id"), _google(GoogleProfile(email=email, name="Admin")):
        resp = client.post("/api/auth/google", json={"credential": "a" * 40})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_password_signup_never_promotes_a_listed_admin_email(client):
    """The takeover: registering an ADMIN_EMAILS address by password must not
    grant admin, because the address is unverified."""
    email = f"admin-{uuid.uuid4()}@campus.ai"
    with patch.object(settings, "ADMIN_EMAILS", [email]):
        resp = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
        assert resp.status_code == 201
        headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

        assert client.get("/api/auth/me", headers=headers).json()["role"] != "admin"
        assert client.get("/api/admin/ping", headers=headers).status_code == 403


def test_password_signin_never_promotes_a_listed_admin_email(client):
    email = f"squatter-{uuid.uuid4()}@campus.ai"
    signup = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
    assert signup.status_code == 201

    with patch.object(settings, "ADMIN_EMAILS", [email]):
        resp = client.post("/api/auth/signin", json={"email": email, "password": "testpass123"})
        assert resp.status_code == 200
        headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
        assert client.get("/api/admin/ping", headers=headers).status_code == 403


def test_google_signin_bootstraps_admin_when_email_is_listed(client):
    email = f"admin-{uuid.uuid4()}@campus.ai"
    with patch.object(settings, "ADMIN_EMAILS", [email]):
        headers = _google_signin(client, email)

        assert client.get("/api/auth/me", headers=headers).json()["role"] == "admin"
        ping = client.get("/api/admin/ping", headers=headers)
        assert ping.status_code == 200
        assert ping.json() == {"status": "ok", "role": "admin"}


def test_google_signin_promotes_an_existing_account_retroactively(client):
    """An email added to ADMIN_EMAILS after the account exists is promoted the
    next time its owner signs in with Google."""
    email = f"retro-admin-{uuid.uuid4()}@campus.ai"
    signup = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
    assert signup.status_code == 201
    first_headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}
    assert client.get("/api/admin/ping", headers=first_headers).status_code == 403

    with patch.object(settings, "ADMIN_EMAILS", [email]):
        new_headers = _google_signin(client, email)
        assert client.get("/api/admin/ping", headers=new_headers).status_code == 200
        # get_current_user re-reads the role from the DB, so the original
        # token sees the promotion too.
        assert client.get("/api/admin/ping", headers=first_headers).status_code == 200


def test_admin_bootstrap_is_case_insensitive_on_email(client):
    email = f"CaseTest-{uuid.uuid4()}@campus.ai"
    with patch.object(settings, "ADMIN_EMAILS", [email.lower()]):
        headers = _google_signin(client, email)
        assert client.get("/api/admin/ping", headers=headers).status_code == 200
