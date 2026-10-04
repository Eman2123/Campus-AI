"""Day 34 — admin auth/role-gating.

ADMIN_EMAILS is empty by default in test environments, so each test that
needs an admin patches it to a specific email before signing that user
up (or back in), exercising the real bootstrap path rather than poking
the role directly in the DB.
"""
import uuid
from unittest.mock import patch

from app.core.config import settings


def test_admin_ping_rejects_non_admin(client, auth_headers):
    resp = client.get("/api/admin/ping", headers=auth_headers)
    assert resp.status_code == 403


def test_admin_ping_requires_auth(client):
    resp = client.get("/api/admin/ping")
    # HTTPBearer(auto_error=True) (the default, used by get_current_user)
    # returns 403 for a completely missing Authorization header — same
    # finding as Day 30's streaming-endpoint auth test.
    assert resp.status_code == 403


def test_signup_bootstraps_admin_when_email_is_listed(client):
    email = f"admin-{uuid.uuid4()}@campus.ai"
    with patch.object(settings, "ADMIN_EMAILS", [email]):
        signup_resp = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
        assert signup_resp.status_code == 201
        token = signup_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        me = client.get("/api/auth/me", headers=headers).json()
        assert me["role"] == "admin"

        ping = client.get("/api/admin/ping", headers=headers)
        assert ping.status_code == 200
        assert ping.json() == {"status": "ok", "role": "admin"}


def test_admin_bootstrap_applies_retroactively_on_signin(client):
    """An email added to ADMIN_EMAILS after the account already exists
    should promote that user the next time they sign in — no manual DB
    update needed."""
    email = f"retro-admin-{uuid.uuid4()}@campus.ai"

    # Signs up before their email is on the admin list — stays "student".
    signup_resp = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
    assert signup_resp.status_code == 201
    first_headers = {"Authorization": f"Bearer {signup_resp.json()['access_token']}"}
    assert client.get("/api/admin/ping", headers=first_headers).status_code == 403

    with patch.object(settings, "ADMIN_EMAILS", [email]):
        signin_resp = client.post("/api/auth/signin", json={"email": email, "password": "testpass123"})
        assert signin_resp.status_code == 200
        new_headers = {"Authorization": f"Bearer {signin_resp.json()['access_token']}"}

        assert client.get("/api/admin/ping", headers=new_headers).status_code == 200
        # the promotion is a real DB change, not tied to the token used —
        # the *original* token should now see it too, since get_current_user
        # re-reads the role from the DB rather than trusting the JWT.
        assert client.get("/api/admin/ping", headers=first_headers).status_code == 200


def test_admin_bootstrap_is_case_insensitive_on_email(client):
    email = f"CaseTest-{uuid.uuid4()}@campus.ai"
    with patch.object(settings, "ADMIN_EMAILS", [email.lower()]):
        signup_resp = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
        assert signup_resp.status_code == 201
        headers = {"Authorization": f"Bearer {signup_resp.json()['access_token']}"}
        assert client.get("/api/admin/ping", headers=headers).status_code == 200
