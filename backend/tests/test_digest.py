"""Day 22 — Email Digest connector: daily summary job.

Same pattern as test_schedule.py's reminder tests: create real schedule
rows through the Planner Agent (Day 19) via the chat endpoint, then
exercise the digest through its self-serve trigger endpoint, mocking
`send_email` at the network boundary.
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch


def _create_deadline_via_chat(client, headers, title_hint: str, due: datetime) -> None:
    resp = client.post(
        "/api/chat",
        json={
            "message": f"help me plan for my {title_hint} on {due.strftime('%Y-%m-%d')}",
            "session_id": f"day22-{uuid.uuid4()}",
        },
        headers=headers,
    )
    assert resp.status_code == 200


def test_digest_me_sends_once_when_something_is_upcoming(client, auth_headers):
    due = datetime.now(timezone.utc) + timedelta(days=3)
    _create_deadline_via_chat(client, auth_headers, "Biology Midterm", due)

    with patch("app.core.digest.send_email") as mock_send_email:
        resp = client.post("/api/schedule/digest-me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["digests_sent"] == 1
        assert mock_send_email.call_count == 1

        _, kwargs = mock_send_email.call_args
        assert "Biology Midterm" in kwargs["body"]


def test_digest_me_is_not_gated_like_reminders(client, auth_headers):
    """Unlike remind-me (Day 20), calling digest-me twice in a row should
    send twice — a digest is a recurring daily briefing, not a one-time
    nag, so there's no reminder_sent_at-style suppression here."""
    due = datetime.now(timezone.utc) + timedelta(days=3)
    _create_deadline_via_chat(client, auth_headers, "Art History Essay", due)

    with patch("app.core.digest.send_email") as mock_send_email:
        first = client.post("/api/schedule/digest-me", headers=auth_headers)
        second = client.post("/api/schedule/digest-me", headers=auth_headers)
        assert first.json()["digests_sent"] == 1
        assert second.json()["digests_sent"] == 1
        assert mock_send_email.call_count == 2


def test_digest_me_skips_students_with_nothing_upcoming(client, auth_headers):
    with patch("app.core.digest.send_email") as mock_send_email:
        resp = client.post("/api/schedule/digest-me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["digests_sent"] == 0
        mock_send_email.assert_not_called()


def test_digest_me_excludes_items_outside_the_lookahead_window(client, auth_headers):
    far_future = datetime.now(timezone.utc) + timedelta(days=60)
    _create_deadline_via_chat(client, auth_headers, "Far Future Final", far_future)

    with patch("app.core.digest.send_email") as mock_send_email:
        resp = client.post("/api/schedule/digest-me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["digests_sent"] == 0
        mock_send_email.assert_not_called()
