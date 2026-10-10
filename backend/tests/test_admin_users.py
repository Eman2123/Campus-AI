"""Day 35 — user management table (list, search, disable).

Builds an admin via the Day 34 ADMIN_EMAILS bootstrap (same pattern as
test_admin.py), then exercises list/search/disable/enable through the
real endpoints.
"""
import uuid
from unittest.mock import patch

from app.core.config import settings


def _make_admin(client) -> dict:
    email = f"admin-{uuid.uuid4()}@campus.ai"
    with patch.object(settings, "ADMIN_EMAILS", [email]):
        resp = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_student(client, email: str | None = None) -> tuple[dict, str]:
    email = email or f"student-{uuid.uuid4()}@campus.ai"
    resp = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
    assert resp.status_code == 201
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}, email


def test_list_users_requires_admin(client, auth_headers):
    resp = client.get("/api/admin/users", headers=auth_headers)
    assert resp.status_code == 403


def test_admin_can_list_users(client):
    admin_headers = _make_admin(client)
    _, student_email = _make_student(client)

    resp = client.get("/api/admin/users", headers=admin_headers)
    assert resp.status_code == 200
    emails = [u["email"] for u in resp.json()]
    assert student_email in emails


def test_search_filters_by_email_substring(client):
    admin_headers = _make_admin(client)
    marker = uuid.uuid4().hex[:8]
    _, distinctive_email = _make_student(client, email=f"searchtest-{marker}@campus.ai")
    _make_student(client)  # a decoy that shouldn't match

    resp = client.get(f"/api/admin/users?q={marker}", headers=admin_headers)
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert results[0]["email"] == distinctive_email


def test_admin_can_disable_and_enable_a_user(client):
    admin_headers = _make_admin(client)
    student_headers, student_email = _make_student(client)

    users = client.get("/api/admin/users", headers=admin_headers).json()
    student_id = next(u["id"] for u in users if u["email"] == student_email)

    # Works before disabling
    assert client.get("/api/auth/me", headers=student_headers).status_code == 200

    disable_resp = client.post(f"/api/admin/users/{student_id}/disable", headers=admin_headers)
    assert disable_resp.status_code == 200
    assert disable_resp.json()["is_active"] is False

    # Day 35: takes effect immediately on the *existing* token, not just
    # on next sign in — same DB-re-read mechanism as Day 34's role check.
    blocked_resp = client.get("/api/auth/me", headers=student_headers)
    assert blocked_resp.status_code == 401

    enable_resp = client.post(f"/api/admin/users/{student_id}/enable", headers=admin_headers)
    assert enable_resp.status_code == 200
    assert enable_resp.json()["is_active"] is True
    assert client.get("/api/auth/me", headers=student_headers).status_code == 200


def test_disabled_user_cannot_sign_in(client):
    admin_headers = _make_admin(client)
    _, student_email = _make_student(client)

    users = client.get("/api/admin/users", headers=admin_headers).json()
    student_id = next(u["id"] for u in users if u["email"] == student_email)
    client.post(f"/api/admin/users/{student_id}/disable", headers=admin_headers)

    resp = client.post("/api/auth/signin", json={"email": student_email, "password": "testpass123"})
    assert resp.status_code == 403
    assert resp.json()["detail"] == "This account has been disabled"


def test_admin_cannot_disable_own_account(client):
    admin_headers = _make_admin(client)
    me = client.get("/api/auth/me", headers=admin_headers).json()

    resp = client.post(f"/api/admin/users/{me['id']}/disable", headers=admin_headers)
    assert resp.status_code == 400


def test_disable_nonexistent_user_returns_404(client):
    admin_headers = _make_admin(client)
    resp = client.post(f"/api/admin/users/{uuid.uuid4()}/disable", headers=admin_headers)
    assert resp.status_code == 404
