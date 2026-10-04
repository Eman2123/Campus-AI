"""Day 16 — Document upload endpoint + storage."""
import os
import uuid

import pytest


def test_upload_document_success(client, auth_headers):
    resp = client.post(
        "/api/documents/upload",
        files={"file": ("notes.txt", b"Photosynthesis converts light into energy.", "text/plain")},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["filename"] == "notes.txt"
    assert body["embedding_status"] == "pending"


def test_upload_rejects_unsupported_file_type(client, auth_headers):
    resp = client.post(
        "/api/documents/upload",
        files={"file": ("virus.exe", b"fake binary", "application/octet-stream")},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_list_and_delete_document(client, auth_headers):
    upload = client.post(
        "/api/documents/upload",
        files={"file": ("notes.txt", b"some content", "text/plain")},
        headers=auth_headers,
    )
    doc_id = upload.json()["id"]

    listed = client.get("/api/documents", headers=auth_headers)
    assert listed.status_code == 200
    assert any(d["id"] == doc_id for d in listed.json())

    deleted = client.delete(f"/api/documents/{doc_id}", headers=auth_headers)
    assert deleted.status_code == 204

    listed_after = client.get("/api/documents", headers=auth_headers)
    assert not any(d["id"] == doc_id for d in listed_after.json())


def test_documents_are_isolated_per_user(client):
    """One user should never see another user's uploaded documents."""
    email_a = f"user-a-{uuid.uuid4()}@campus.ai"
    email_b = f"user-b-{uuid.uuid4()}@campus.ai"
    token_a = client.post("/api/auth/signup", json={"email": email_a, "password": "testpass123"}).json()["access_token"]
    token_b = client.post("/api/auth/signup", json={"email": email_b, "password": "testpass123"}).json()["access_token"]

    client.post(
        "/api/documents/upload",
        files={"file": ("user_a_notes.txt", b"user a content", "text/plain")},
        headers={"Authorization": f"Bearer {token_a}"},
    )

    docs_for_b = client.get("/api/documents", headers={"Authorization": f"Bearer {token_b}"})
    assert docs_for_b.status_code == 200
    assert len(docs_for_b.json()) == 0
