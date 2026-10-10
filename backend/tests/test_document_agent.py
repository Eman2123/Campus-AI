"""Day 18 — Document Agent: retrieval + grounded Q&A node.

Runs through the real chat endpoint (not a mocked graph) so upload,
embedding (Day 17), retrieval, and the graph route all exercise real
code. AIML_API_KEY usually isn't set in test envs, so assertions are
written to hold under both the stub fallback and a real LLM call —
they check *that* retrieval happened and stayed scoped to the right
user, not the exact wording of a generated answer.
"""
import uuid

from app.agents.document import NO_DOCUMENTS_REPLY


def _signup(client, label: str) -> dict:
    email = f"doc-agent-{label}-{uuid.uuid4()}@campus.ai"
    resp = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _upload_ready_document(client, headers, filename: str, text: str) -> str:
    resp = client.post(
        "/api/documents/upload",
        files={"file": (filename, text.encode(), "text/plain")},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    doc_id = resp.json()["id"]
    # TestClient runs BackgroundTasks synchronously (same as test_rag_pipeline.py),
    # so embedding_status is already "ready" by the time upload() returns.
    listed = client.get("/api/documents", headers=headers).json()
    doc = next(d for d in listed if d["id"] == doc_id)
    assert doc["embedding_status"] == "ready"
    return doc_id


def test_document_agent_asks_for_upload_when_none_exist(client, auth_headers):
    """A brand-new user with no uploads should get a clear 'nothing to
    search' answer, never a hallucinated one."""
    resp = client.post(
        "/api/chat",
        json={"message": "answer this using my uploaded file", "session_id": f"day18-{uuid.uuid4()}"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "document"
    assert body["agent_used"] == "document"
    assert body["reply"] == NO_DOCUMENTS_REPLY


def test_document_agent_retrieves_from_uploaded_document(client):
    headers = _signup(client, "owner")
    _upload_ready_document(
        client,
        headers,
        "photosynthesis-notes.txt",
        " ".join(["Photosynthesis converts sunlight into chemical energy in chloroplasts."] * 40),
    )

    resp = client.post(
        "/api/chat",
        json={"message": "answer this using my uploaded file: what does photosynthesis convert?", "session_id": f"day18-{uuid.uuid4()}"},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "document"
    assert body["agent_used"] == "document"
    assert body["reply"] != NO_DOCUMENTS_REPLY
    assert len(body["reply"]) > 0


def test_document_agent_is_scoped_to_the_asking_user(client):
    """One student's uploaded notes must never leak into another
    student's Document agent answers (same isolation guarantee as the
    plain document list/delete endpoints, Day 16)."""
    owner_headers = _signup(client, "owner2")
    other_headers = _signup(client, "other")

    _upload_ready_document(
        client,
        owner_headers,
        "owner-only-notes.txt",
        " ".join(["The mitochondria is the powerhouse of the cell."] * 40),
    )

    resp = client.post(
        "/api/chat",
        json={"message": "answer this using my uploaded file", "session_id": f"day18-{uuid.uuid4()}"},
        headers=other_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["agent_used"] == "document"
    assert body["reply"] == NO_DOCUMENTS_REPLY  # other user has no documents of their own
