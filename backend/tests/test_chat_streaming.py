"""Day 30 — streaming response rendering.

TestClient buffers the full StreamingResponse body by the time
client.post() returns (no need for a manual incremental reader to test
this), so these tests parse the complete SSE text and check the
sequence of events rather than true real-time delivery. STREAM_CHUNK_DELAY_MS
is patched to 0 so the artificial typewriter pacing doesn't slow the
test suite down.
"""
import json
import uuid
from unittest.mock import patch

from app.core.config import settings


def parse_sse(text: str) -> list[tuple[str, dict]]:
    events = []
    for block in text.strip().split("\n\n"):
        if not block.strip():
            continue
        event_name = "message"
        data = None
        for line in block.splitlines():
            if line.startswith("event:"):
                event_name = line[len("event:") :].strip()
            elif line.startswith("data:"):
                data = json.loads(line[len("data:") :].strip())
        events.append((event_name, data))
    return events


def test_chat_stream_content_type_is_sse(client, auth_headers):
    with patch.object(settings, "STREAM_CHUNK_DELAY_MS", 0):
        resp = client.post(
            "/api/chat/stream",
            json={"message": "quiz me on the French Revolution", "session_id": f"day30-{uuid.uuid4()}"},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")


def test_chat_stream_reconstructs_the_full_reply_and_reports_routing(client, auth_headers):
    with patch.object(settings, "STREAM_CHUNK_DELAY_MS", 0):
        resp = client.post(
            "/api/chat/stream",
            json={"message": "quiz me on the French Revolution", "session_id": f"day30-{uuid.uuid4()}"},
            headers=auth_headers,
        )
    events = parse_sse(resp.text)

    token_events = [data for name, data in events if name == "token"]
    done_events = [data for name, data in events if name == "done"]

    assert len(token_events) >= 1
    assert len(done_events) == 1
    assert done_events[0]["intent"] == "quiz"
    assert done_events[0]["agent_used"] == "quiz"

    reconstructed = "".join(t["content"] for t in token_events)
    assert len(reconstructed) > 0
    # every token event must come before the one done event
    assert [name for name, _ in events][-1] == "done"


def test_chat_stream_matches_non_streaming_endpoint_routing(client, auth_headers):
    """Both endpoints run the exact same graph — routing should agree
    even though each call is an independent graph invocation (reply
    text itself isn't asserted equal, since a real LLM's sampling can
    legitimately vary between two separate calls)."""
    message = "help me solve this homework: 2x + 4 = 10"

    plain_resp = client.post(
        "/api/chat", json={"message": message, "session_id": f"day30-plain-{uuid.uuid4()}"}, headers=auth_headers
    )
    assert plain_resp.status_code == 200
    plain_body = plain_resp.json()

    with patch.object(settings, "STREAM_CHUNK_DELAY_MS", 0):
        stream_resp = client.post(
            "/api/chat/stream",
            json={"message": message, "session_id": f"day30-stream-{uuid.uuid4()}"},
            headers=auth_headers,
        )
    done_event = next(data for name, data in parse_sse(stream_resp.text) if name == "done")

    assert done_event["intent"] == plain_body["intent"]
    assert done_event["agent_used"] == plain_body["agent_used"]


def test_chat_stream_emits_error_event_on_graph_failure(client, auth_headers):
    with patch("app.api.routes.agent.campus_ai_graph.ainvoke", side_effect=RuntimeError("boom")):
        resp = client.post(
            "/api/chat/stream",
            json={"message": "quiz me on anything", "session_id": f"day30-{uuid.uuid4()}"},
            headers=auth_headers,
        )

    assert resp.status_code == 200  # the stream itself starts fine; the failure is an SSE event
    events = parse_sse(resp.text)
    assert events == [("error", {"message": "Something went wrong generating a response."})]


def test_chat_stream_requires_auth(client):
    resp = client.post(
        "/api/chat/stream",
        json={"message": "hello", "session_id": f"day30-{uuid.uuid4()}"},
    )
    # HTTPBearer(auto_error=True) (the default, used by get_current_user)
    # returns 403 for a completely missing Authorization header — 401 is
    # only for a header that's present but invalid/expired.
    assert resp.status_code == 403
