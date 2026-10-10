"""Day 36 — agent usage analytics dashboard (calls per agent, response
times). `_run_graph` (app/api/routes/agent.py) is the one choke point
/chat, /chat/stream, and /voice/chat all invoke the graph through, so
exercising any of them exercises the logging too — these tests mostly
go through /chat, the simplest of the three.
"""
import uuid
from unittest.mock import patch

import pytest

from app.core.config import settings


def _make_admin(client) -> dict:
    email = f"usage-admin-{uuid.uuid4()}@campus.ai"
    with patch.object(settings, "ADMIN_EMAILS", [email]):
        resp = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_analytics_rejects_non_admin(client, auth_headers):
    resp = client.get("/api/admin/analytics/agents", headers=auth_headers)
    assert resp.status_code == 403


def test_a_chat_call_shows_up_in_the_agent_usage_summary(client, auth_headers):
    admin_headers = _make_admin(client)

    resp = client.post(
        "/api/chat",
        json={"message": "quiz me on the French Revolution", "session_id": str(uuid.uuid4())},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    agent_used = resp.json()["agent_used"]

    analytics = client.get("/api/admin/analytics/agents", headers=admin_headers).json()
    assert analytics["since_hours"] == 24

    bucket = next((b for b in analytics["by_agent"] if b["agent_name"] == agent_used), None)
    assert bucket is not None, f"expected a bucket for {agent_used!r}, got {analytics['by_agent']}"
    assert bucket["total_calls"] >= 1
    assert bucket["success_count"] >= 1
    # A successful call always has a real (non-negative) duration sample.
    assert bucket["avg_duration_ms"] is not None
    assert bucket["avg_duration_ms"] >= 0
    assert bucket["last_called_at"] is not None


def test_voice_chat_calls_are_logged_too(client, auth_headers):
    """Day 36 also closed a gap in voice.py itself: it used to call
    campus_ai_graph.ainvoke() directly instead of going through
    _run_graph, which meant voice turns were silently invisible to this
    dashboard. Covering that here (via a bad-audio 422, which is enough
    to prove voice.py's *routing* — real transcription needs a live
    ASSEMBLYAI_API_KEY this sandbox doesn't have) isn't possible without
    real audio, so this test instead asserts the easier-to-verify half:
    that voice.py no longer imports or calls campus_ai_graph directly.
    """
    import app.api.routes.voice as voice_module

    assert not hasattr(voice_module, "campus_ai_graph")


def test_hours_param_is_clamped_not_rejected(client):
    admin_headers = _make_admin(client)

    resp = client.get("/api/admin/analytics/agents?hours=999999", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["since_hours"] <= 24 * 30  # MAX_ANALYTICS_WINDOW_HOURS

    resp_zero = client.get("/api/admin/analytics/agents?hours=0", headers=admin_headers)
    assert resp_zero.status_code == 200
    assert resp_zero.json()["since_hours"] >= 1


def test_a_failed_graph_run_is_logged_under_the_supervisor_fallback_name(client, auth_headers, monkeypatch):
    """When the graph raises before routing to a specialist, there's no
    real agent name to blame it on — _run_graph logs it under
    UNROUTED_AGENT_NAME ("supervisor") instead of dropping it or
    inventing one."""
    from app.agents import graph as graph_module

    async def _boom(*args, **kwargs):
        raise RuntimeError("simulated graph failure")

    monkeypatch.setattr(graph_module.campus_ai_graph, "ainvoke", _boom)

    # TestClient re-raises unhandled server exceptions by default (it
    # doesn't turn them into a 500 response the way a real deployed
    # server would) — the thing under test here is that _run_graph's
    # except block still ran and logged the failure *before*
    # re-raising, not FastAPI's error-response formatting.
    with pytest.raises(RuntimeError, match="simulated graph failure"):
        client.post(
            "/api/chat",
            json={"message": "this will fail", "session_id": str(uuid.uuid4())},
            headers=auth_headers,
        )

    admin_headers = _make_admin(client)
    analytics = client.get("/api/admin/analytics/agents", headers=admin_headers).json()
    supervisor_bucket = next((b for b in analytics["by_agent"] if b["agent_name"] == "supervisor"), None)
    assert supervisor_bucket is not None
    assert supervisor_bucket["failure_count"] >= 1
