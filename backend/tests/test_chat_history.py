"""Day 31 — closing the message-persistence gap (flagged Day 28) and the
session/history sidebar endpoints it enables.
"""
import uuid
from unittest.mock import patch

from app.core.config import settings


def test_chat_persists_a_session_and_two_messages(client, auth_headers):
    session_id = str(uuid.uuid4())
    resp = client.post(
        "/api/chat",
        json={"message": "quiz me on the French Revolution", "session_id": session_id},
        headers=auth_headers,
    )
    assert resp.status_code == 200

    sessions = client.get("/api/sessions", headers=auth_headers).json()
    assert len(sessions) == 1
    assert sessions[0]["id"] == session_id
    assert sessions[0]["message_count"] == 2
    assert sessions[0]["preview"] == "quiz me on the French Revolution"

    messages = client.get(f"/api/sessions/{session_id}/messages", headers=auth_headers).json()
    assert [m["role"] for m in messages] == ["user", "assistant"]
    assert messages[0]["content"] == "quiz me on the French Revolution"
    assert messages[1]["agent_used"] == "quiz"


def test_continuing_the_same_session_id_accumulates_into_one_session(client, auth_headers):
    session_id = str(uuid.uuid4())
    client.post("/api/chat", json={"message": "quiz me on chapter 1", "session_id": session_id}, headers=auth_headers)
    client.post("/api/chat", json={"message": "quiz me on chapter 2", "session_id": session_id}, headers=auth_headers)

    sessions = client.get("/api/sessions", headers=auth_headers).json()
    assert len(sessions) == 1
    assert sessions[0]["message_count"] == 4

    messages = client.get(f"/api/sessions/{session_id}/messages", headers=auth_headers).json()
    assert len(messages) == 4
    assert messages[0]["content"] == "quiz me on chapter 1"
    assert messages[2]["content"] == "quiz me on chapter 2"


def test_non_uuid_session_id_still_persists_without_crashing(client, auth_headers):
    """session_id is primarily LangGraph's thread_id (Day 13) and doesn't
    have to be a UUID — a legacy/test-style string should still result
    in working, stable persistence via the derived-UUID fallback."""
    resp1 = client.post(
        "/api/chat", json={"message": "first message", "session_id": "my-custom-thread"}, headers=auth_headers
    )
    resp2 = client.post(
        "/api/chat", json={"message": "second message", "session_id": "my-custom-thread"}, headers=auth_headers
    )
    assert resp1.status_code == 200
    assert resp2.status_code == 200

    sessions = client.get("/api/sessions", headers=auth_headers).json()
    assert len(sessions) == 1  # same raw session_id -> same derived session, not two
    assert sessions[0]["message_count"] == 4


def test_same_default_session_id_is_isolated_per_user(client):
    """Two different users both relying on the ChatRequest default
    ("dev-session") must not collide into the same DB session."""
    email_a = f"hist-a-{uuid.uuid4()}@campus.ai"
    email_b = f"hist-b-{uuid.uuid4()}@campus.ai"
    token_a = client.post("/api/auth/signup", json={"email": email_a, "password": "testpass123"}).json()["access_token"]
    token_b = client.post("/api/auth/signup", json={"email": email_b, "password": "testpass123"}).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    client.post("/api/chat", json={"message": "hello from A"}, headers=headers_a)
    client.post("/api/chat", json={"message": "hello from B"}, headers=headers_b)

    sessions_a = client.get("/api/sessions", headers=headers_a).json()
    sessions_b = client.get("/api/sessions", headers=headers_b).json()
    assert len(sessions_a) == 1
    assert len(sessions_b) == 1
    assert sessions_a[0]["id"] != sessions_b[0]["id"]
    assert sessions_a[0]["preview"] == "hello from A"
    assert sessions_b[0]["preview"] == "hello from B"


def test_session_messages_are_scoped_to_the_owning_user(client, auth_headers):
    session_id = str(uuid.uuid4())
    client.post("/api/chat", json={"message": "private question", "session_id": session_id}, headers=auth_headers)

    other_email = f"hist-other-{uuid.uuid4()}@campus.ai"
    other_token = client.post("/api/auth/signup", json={"email": other_email, "password": "testpass123"}).json()[
        "access_token"
    ]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    resp = client.get(f"/api/sessions/{session_id}/messages", headers=other_headers)
    assert resp.status_code == 404

    other_sessions = client.get("/api/sessions", headers=other_headers).json()
    assert other_sessions == []


def test_sessions_are_ordered_by_most_recent_activity(client, auth_headers):
    older_session = str(uuid.uuid4())
    newer_session = str(uuid.uuid4())
    client.post("/api/chat", json={"message": "older conversation", "session_id": older_session}, headers=auth_headers)
    client.post("/api/chat", json={"message": "newer conversation", "session_id": newer_session}, headers=auth_headers)
    # touch the older one again — it should now sort above the newer one
    client.post("/api/chat", json={"message": "back to the older one", "session_id": older_session}, headers=auth_headers)

    sessions = client.get("/api/sessions", headers=auth_headers).json()
    assert sessions[0]["id"] == older_session
    assert sessions[1]["id"] == newer_session


def test_chat_stream_also_persists(client, auth_headers):
    session_id = str(uuid.uuid4())
    with patch.object(settings, "STREAM_CHUNK_DELAY_MS", 0):
        resp = client.post(
            "/api/chat/stream",
            json={"message": "quiz me on cell biology", "session_id": session_id},
            headers=auth_headers,
        )
    assert resp.status_code == 200

    messages = client.get(f"/api/sessions/{session_id}/messages", headers=auth_headers).json()
    assert [m["role"] for m in messages] == ["user", "assistant"]
    assert messages[0]["content"] == "quiz me on cell biology"


def test_voice_chat_persists_with_transcript_as_the_user_message(client, auth_headers):
    session_id = str(uuid.uuid4())
    with patch.object(settings, "ASSEMBLYAI_API_KEY", "fake-key-for-test"), patch(
        "app.api.routes.voice.transcribe_audio", return_value="what is photosynthesis"
    ):
        resp = client.post(
            "/api/voice/chat",
            files={"audio": ("voice.webm", b"fake-audio-bytes", "audio/webm")},
            data={"session_id": session_id},
            headers=auth_headers,
        )
    assert resp.status_code == 200

    messages = client.get(f"/api/sessions/{session_id}/messages", headers=auth_headers).json()
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "what is photosynthesis"
    assert messages[1]["role"] == "assistant"
