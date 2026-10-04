"""Day 20 — Calendar Export (ICS generator) + Deadline Reminders.

`build_ics` is tested directly (pure function, no DB). The reminder job
and the ICS export endpoint both need real schedule rows, which only
exist once the Planner Agent (Day 19) has created some — so these tests
go through the real chat endpoint first, same pattern as
test_planner_agent.py and test_document_agent.py.
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from icalendar import Calendar

from app.core.calendar_export import build_ics
from app.models.schedule import Schedule


def _fake_schedule(title: str, due_date: datetime, source: str = "deadline") -> Schedule:
    return Schedule(id=uuid.uuid4(), user_id=uuid.uuid4(), title=title, due_date=due_date, source=source)


def test_build_ics_produces_one_event_per_schedule_row():
    due = datetime(2026, 11, 14, tzinfo=timezone.utc)
    schedules = [
        _fake_schedule("Chemistry Final", due, source="deadline"),
        _fake_schedule("Study session 1/2: Chemistry", due - timedelta(days=10), source="study_session"),
    ]

    cal = Calendar.from_ical(build_ics(schedules))
    events = list(cal.walk("VEVENT"))

    assert len(events) == 2
    summaries = {str(e["SUMMARY"]) for e in events}
    assert summaries == {"Chemistry Final", "Study session 1/2: Chemistry"}


def test_build_ics_handles_empty_schedule():
    cal = Calendar.from_ical(build_ics([]))
    assert list(cal.walk("VEVENT")) == []


def _create_deadline_via_chat(client, headers, title_hint: str, due: datetime) -> None:
    resp = client.post(
        "/api/chat",
        json={
            "message": f"help me plan for my {title_hint} on {due.strftime('%Y-%m-%d')}",
            "session_id": f"day20-{uuid.uuid4()}",
        },
        headers=headers,
    )
    assert resp.status_code == 200


def test_schedule_export_ics_returns_events_for_the_users_own_schedule(client, auth_headers):
    due = datetime.now(timezone.utc) + timedelta(days=30)
    _create_deadline_via_chat(client, auth_headers, "Physics Midterm", due)

    resp = client.get("/api/schedule/export.ics", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/calendar")

    cal = Calendar.from_ical(resp.content)
    events = list(cal.walk("VEVENT"))
    assert len(events) >= 1
    assert any("Physics Midterm" in str(e["SUMMARY"]) for e in events)


def test_schedule_export_ics_is_scoped_to_the_requesting_user(client):
    email_a = f"cal-a-{uuid.uuid4()}@campus.ai"
    email_b = f"cal-b-{uuid.uuid4()}@campus.ai"
    token_a = client.post("/api/auth/signup", json={"email": email_a, "password": "testpass123"}).json()["access_token"]
    token_b = client.post("/api/auth/signup", json={"email": email_b, "password": "testpass123"}).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    due = datetime.now(timezone.utc) + timedelta(days=30)
    _create_deadline_via_chat(client, headers_a, "Astronomy Quiz", due)

    resp_b = client.get("/api/schedule/export.ics", headers=headers_b)
    assert resp_b.status_code == 200
    cal_b = Calendar.from_ical(resp_b.content)
    assert list(cal_b.walk("VEVENT")) == []  # user B has no schedule of their own


def test_remind_me_sends_for_deadlines_within_the_window_and_is_idempotent(client, auth_headers):
    """A deadline inside REMINDER_LEAD_TIME_HOURS should get exactly one
    reminder — calling remind-me again right after must send zero more,
    since reminder_sent_at is now set."""
    due_soon = datetime.now(timezone.utc) + timedelta(hours=24)
    _create_deadline_via_chat(client, auth_headers, "Spanish Oral Exam", due_soon)

    with patch("app.core.reminders.send_email") as mock_send_email:
        first = client.post("/api/schedule/remind-me", headers=auth_headers)
        assert first.status_code == 200
        assert first.json()["reminders_sent"] == 1
        assert mock_send_email.call_count == 1

        second = client.post("/api/schedule/remind-me", headers=auth_headers)
        assert second.status_code == 200
        assert second.json()["reminders_sent"] == 0  # already reminded — no duplicate


def test_remind_me_skips_deadlines_outside_the_window(client, auth_headers):
    far_future = datetime.now(timezone.utc) + timedelta(days=90)
    _create_deadline_via_chat(client, auth_headers, "Far Future Final", far_future)

    with patch("app.core.reminders.send_email") as mock_send_email:
        resp = client.post("/api/schedule/remind-me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["reminders_sent"] == 0
        mock_send_email.assert_not_called()


def test_list_schedule_returns_deadlines_and_study_sessions(client, auth_headers):
    due = datetime.now(timezone.utc) + timedelta(days=20)
    _create_deadline_via_chat(client, auth_headers, "Biology Final", due)

    resp = client.get("/api/schedule", headers=auth_headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert {"deadline", "study_session"} >= {item["source"] for item in items}
    # ordered by due_date ascending
    due_dates = [item["due_date"] for item in items]
    assert due_dates == sorted(due_dates)


def test_list_schedule_is_scoped_to_the_requesting_user(client):
    email_a = f"sched-a-{uuid.uuid4()}@campus.ai"
    email_b = f"sched-b-{uuid.uuid4()}@campus.ai"
    token_a = client.post("/api/auth/signup", json={"email": email_a, "password": "testpass123"}).json()["access_token"]
    token_b = client.post("/api/auth/signup", json={"email": email_b, "password": "testpass123"}).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    due = datetime.now(timezone.utc) + timedelta(days=10)
    _create_deadline_via_chat(client, headers_a, "Chemistry Final", due)

    items_b = client.get("/api/schedule", headers=headers_b).json()
    assert items_b == []
