"""Fix 5 — LangGraph threads and chat sessions belong to one user.

The graph's thread_id used to be the raw client session id (default
"dev-session"), so different users could share one checkpointed conversation,
and a session id owned by someone else was accepted. Now the thread is
"<user_id>:<session uuid>" and a foreign session id is a 404.
"""
import uuid

from app.agents.graph import campus_ai_graph
from app.core.chat_history import thread_id_for


def _signup(client) -> tuple[dict, str]:
    email = f"iso-{uuid.uuid4()}@campus.ai"
    resp = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
    assert resp.status_code == 201, resp.text
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
    return headers, client.get("/api/auth/me", headers=headers).json()["id"]


def _thread_messages(client, user_id: str, raw_session_id: str) -> list[str]:
    config = {"configurable": {"thread_id": thread_id_for(user_id, raw_session_id)}}
    snapshot = client.portal.call(campus_ai_graph.aget_state, config)
    return [m.content for m in (snapshot.values or {}).get("messages", [])]


def _chat(client, headers, text: str, session_id: str):
    return client.post("/api/chat", json={"message": text, "session_id": session_id}, headers=headers)


def test_two_users_with_the_same_session_id_do_not_share_graph_state(client):
    headers_a, id_a = _signup(client)
    headers_b, id_b = _signup(client)
    shared = f"shared-{uuid.uuid4()}"  # not a UUID: the old "dev-session" case

    assert _chat(client, headers_a, "explain gravity please", shared).status_code == 200
    assert _chat(client, headers_b, "explain photosynthesis please", shared).status_code == 200

    a_texts = _thread_messages(client, id_a, shared)
    b_texts = _thread_messages(client, id_b, shared)
    assert "explain gravity please" in a_texts and "explain photosynthesis please" not in a_texts
    assert "explain photosynthesis please" in b_texts and "explain gravity please" not in b_texts


def test_thread_ids_are_per_user_and_stable():
    user_a, user_b = str(uuid.uuid4()), str(uuid.uuid4())
    assert thread_id_for(user_a, "dev-session") != thread_id_for(user_b, "dev-session")
    assert thread_id_for(user_a, "dev-session") == thread_id_for(user_a, "dev-session")
    assert thread_id_for(user_a, "dev-session").startswith(f"{user_a}:")


def test_another_users_session_id_is_refused_everywhere(client):
    headers_a, _ = _signup(client)
    headers_b, _ = _signup(client)
    session_id = str(uuid.uuid4())

    assert _chat(client, headers_a, "hello there", session_id).status_code == 200

    assert _chat(client, headers_b, "let me in", session_id).status_code == 404
    stream = client.post("/api/chat/stream", json={"message": "let me in", "session_id": session_id}, headers=headers_b)
    assert stream.status_code == 404  # refused before any streaming starts

    # The owner is unaffected and sees only their own turn.
    history = client.get(f"/api/sessions/{session_id}/messages", headers=headers_a).json()
    assert [m["content"] for m in history if m["role"] == "user"] == ["hello there"]


def test_deleting_a_chat_clears_its_checkpoints(client):
    headers, user_id = _signup(client)
    session_id = str(uuid.uuid4())
    assert _chat(client, headers, "remember this please", session_id).status_code == 200
    assert _thread_messages(client, user_id, session_id)  # state exists

    assert client.delete(f"/api/sessions/{session_id}", headers=headers).status_code == 204
    assert _thread_messages(client, user_id, session_id) == []


def test_clearing_history_and_deleting_the_account_clear_checkpoints(client):
    headers, user_id = _signup(client)
    first, second = str(uuid.uuid4()), str(uuid.uuid4())
    _chat(client, headers, "first chat", first)
    _chat(client, headers, "second chat", second)

    assert client.delete("/api/sessions", headers=headers).status_code == 204
    assert _thread_messages(client, user_id, first) == []
    assert _thread_messages(client, user_id, second) == []

    third = str(uuid.uuid4())
    _chat(client, headers, "third chat", third)
    email = client.get("/api/auth/me", headers=headers).json()["email"]
    assert client.request("DELETE", "/api/auth/me", json={"confirm_email": email}, headers=headers).status_code == 204
    assert _thread_messages(client, user_id, third) == []
