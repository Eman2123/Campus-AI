"""Day 19 — Planner Agent: deadline/study-plan logic.

Pure-logic pieces (date extraction heuristic, session spacing) are tested
directly with no DB involved. The end-to-end save-and-reply behavior is
tested through the real chat endpoint (client/auth_headers fixtures),
same pattern as test_document_agent.py, since there's no standalone
event loop we can safely drive the async DB write from otherwise.
"""
import uuid
from datetime import datetime, timedelta, timezone

from app.agents.planner import (
    CLARIFY_NO_DATE_REPLY,
    _extract_deadline_heuristic,
    build_study_sessions,
)


def test_extract_deadline_heuristic_parses_explicit_date():
    result = _extract_deadline_heuristic("help me plan for my Chemistry final on 2026-11-14")
    assert result is not None
    assert result["due_date"].date().isoformat() == "2026-11-14"


def test_extract_deadline_heuristic_returns_none_without_any_date():
    assert _extract_deadline_heuristic("help me get better at studying in general") is None


def test_build_study_sessions_spaces_sessions_before_due_date():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    due = now + timedelta(days=20)
    sessions = build_study_sessions("Chemistry", due, now)

    assert 1 <= len(sessions) <= 4
    for session in sessions:
        assert now.date() < session["date"].date() < due.date()
    # strictly increasing, no duplicate days
    dates = [s["date"].date() for s in sessions]
    assert dates == sorted(set(dates))


def test_build_study_sessions_returns_empty_when_due_date_is_too_soon():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert build_study_sessions("Chemistry", now + timedelta(hours=6), now) == []
    assert build_study_sessions("Chemistry", now + timedelta(days=1), now) == []


def test_planner_agent_asks_for_a_date_when_none_given(client, auth_headers):
    resp = client.post(
        "/api/chat",
        json={"message": "help me get better at studying in general", "session_id": f"day19-{uuid.uuid4()}"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "planner"
    assert body["agent_used"] == "planner"
    assert body["reply"] == CLARIFY_NO_DATE_REPLY


def test_planner_agent_builds_and_saves_a_study_plan(client, auth_headers):
    due = (datetime.now(timezone.utc) + timedelta(days=21)).strftime("%Y-%m-%d")
    resp = client.post(
        "/api/chat",
        json={
            "message": f"help me plan for my Chemistry final on {due}",
            "session_id": f"day19-{uuid.uuid4()}",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "planner"
    assert body["agent_used"] == "planner"
    assert body["reply"] != CLARIFY_NO_DATE_REPLY
    assert "study plan" in body["reply"].lower()
    assert "added these to your schedule" in body["reply"].lower()
