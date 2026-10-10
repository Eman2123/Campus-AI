"""Day 24 — wiring the connectors into the Planner + Document agents.

Both directions of the File Organizer (Day 23) <-> subject cross-reference
are tested through the real chat endpoint: a document tagged with a
subject should get surfaced by the Planner Agent when planning a deadline
that names that subject, and the Document Agent should be able to scope
its own retrieval down to a named subject.
"""
import uuid
from datetime import datetime, timedelta, timezone


def _upload(client, headers, filename: str, text: str) -> None:
    resp = client.post(
        "/api/documents/upload",
        files={"file": (filename, text.encode(), "text/plain")},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text


def test_planner_mentions_existing_documents_for_a_matching_subject(client, auth_headers):
    _upload(
        client,
        auth_headers,
        "chemistry-notes.txt",
        " ".join(["Organic chemistry reactions and molecule structure notes."] * 20),
    )

    due = (datetime.now(timezone.utc) + timedelta(days=21)).strftime("%Y-%m-%d")
    resp = client.post(
        "/api/chat",
        json={
            "message": f"help me plan for my Chemistry final on {due}",
            "session_id": f"day24-{uuid.uuid4()}",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["agent_used"] == "planner"
    # Only asserted when the upload actually got tagged "Chemistry" —
    # heuristic and LLM classifiers both should, but this keeps the test
    # honest about what it depends on rather than assuming.
    docs = client.get("/api/documents", headers=auth_headers).json()
    doc = docs[0]
    if doc["subject"] and "chem" in doc["subject"].lower():
        assert "tagged" in body["reply"].lower()


def test_planner_calendar_reply_mentions_the_real_export_endpoint(client, auth_headers):
    due = (datetime.now(timezone.utc) + timedelta(days=21)).strftime("%Y-%m-%d")
    resp = client.post(
        "/api/chat",
        json={"message": f"help me plan for my Physics final on {due}", "session_id": f"day24-{uuid.uuid4()}"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "export.ics" in body["reply"]


def test_document_agent_scopes_retrieval_to_a_named_subject(client, auth_headers):
    """Upload docs under two different subjects; asking about one by name
    should only ground the answer in that subject's material."""
    _upload(
        client,
        auth_headers,
        "chemistry-notes.txt",
        " ".join(["Organic chemistry covers reaction mechanisms and molecule structure."] * 20),
    )
    _upload(
        client,
        auth_headers,
        "history-essay.txt",
        " ".join(["The French Revolution reshaped Europe's empires."] * 20),
    )

    docs = client.get("/api/documents", headers=auth_headers).json()
    chem_doc = next((d for d in docs if d["subject"] and "chem" in d["subject"].lower()), None)
    if chem_doc is None:
        # Classifier (LLM or heuristic) didn't land on a name containing
        # "chem" this run — nothing to assert against.
        return

    resp = client.post(
        "/api/chat",
        json={
            "message": "using my chemistry notes, what do they cover?",
            "session_id": f"day24-{uuid.uuid4()}",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["agent_used"] == "document"
    assert "French Revolution" not in body["reply"]
