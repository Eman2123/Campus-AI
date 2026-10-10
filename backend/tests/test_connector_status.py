"""Day 37 — connector status monitoring (calendar export/email/storage
health, plus the scheduled jobs).
"""
import uuid
from unittest.mock import patch

from app.core.config import settings


def _make_admin(client) -> dict:
    email = f"connector-admin-{uuid.uuid4()}@campus.ai"
    with patch.object(settings, "ADMIN_EMAILS", [email]):
        resp = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_connector_status_rejects_non_admin(client, auth_headers):
    resp = client.get("/api/admin/connectors/status", headers=auth_headers)
    assert resp.status_code == 403


def test_connector_status_lists_all_four_connectors(client):
    admin_headers = _make_admin(client)
    resp = client.get("/api/admin/connectors/status", headers=admin_headers)
    assert resp.status_code == 200

    statuses = resp.json()
    names = {row["name"] for row in statuses}
    assert names == {"calendar_export", "email", "file_organizer", "scheduler"}


def test_calendar_export_is_always_healthy(client):
    admin_headers = _make_admin(client)
    statuses = client.get("/api/admin/connectors/status", headers=admin_headers).json()
    calendar = next(row for row in statuses if row["name"] == "calendar_export")
    assert calendar["status"] == "healthy"


def test_email_reports_stub_when_no_key_configured(client):
    admin_headers = _make_admin(client)
    with patch.object(settings, "RESEND_API_KEY", ""):
        statuses = client.get("/api/admin/connectors/status", headers=admin_headers).json()
    email = next(row for row in statuses if row["name"] == "email")
    assert email["status"] == "stub"


def test_email_reports_configured_when_key_is_set(client):
    admin_headers = _make_admin(client)
    with patch.object(settings, "RESEND_API_KEY", "re_fake_key_for_test"):
        statuses = client.get("/api/admin/connectors/status", headers=admin_headers).json()
    email = next(row for row in statuses if row["name"] == "email")
    assert email["status"] == "configured"


def test_file_organizer_reports_stub_when_no_key_file_configured(client):
    admin_headers = _make_admin(client)
    with patch.object(settings, "GOOGLE_SERVICE_ACCOUNT_FILE", ""):
        statuses = client.get("/api/admin/connectors/status", headers=admin_headers).json()
    drive = next(row for row in statuses if row["name"] == "file_organizer")
    assert drive["status"] == "stub"


def test_file_organizer_reports_error_for_a_bad_key_file_path(client, tmp_path):
    admin_headers = _make_admin(client)
    bad_file = tmp_path / "not-real-credentials.json"
    bad_file.write_text("{not valid json")
    with patch.object(settings, "GOOGLE_SERVICE_ACCOUNT_FILE", str(bad_file)):
        statuses = client.get("/api/admin/connectors/status", headers=admin_headers).json()
    drive = next(row for row in statuses if row["name"] == "file_organizer")
    assert drive["status"] == "error"


def test_scheduler_is_healthy_with_both_jobs_registered(client):
    """The app's lifespan (app/main.py) starts the real scheduler for the
    whole TestClient session (see conftest.py's session-scoped client
    fixture), so this exercises the live scheduler state, not a mock."""
    admin_headers = _make_admin(client)
    statuses = client.get("/api/admin/connectors/status", headers=admin_headers).json()
    scheduler = next(row for row in statuses if row["name"] == "scheduler")
    assert scheduler["status"] == "healthy"
    assert "deadline_reminders" in scheduler["detail"]
    assert "daily_digest" in scheduler["detail"]