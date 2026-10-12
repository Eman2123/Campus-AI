"""Day 16 — Document upload endpoint + storage."""
import uuid



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


def test_document_list_supports_limit_and_offset(client, auth_headers):
    for i in range(3):
        resp = client.post(
            "/api/documents/upload",
            files={"file": (f"page-{i}.txt", b"some plain study notes " * 10, "text/plain")},
            headers=auth_headers,
        )
        assert resp.status_code == 201, resp.text

    everything = client.get("/api/documents", headers=auth_headers).json()
    first_two = client.get("/api/documents?limit=2", headers=auth_headers).json()
    rest = client.get("/api/documents?limit=2&offset=2", headers=auth_headers).json()

    assert len(first_two) == 2
    assert [d["id"] for d in first_two + rest] == [d["id"] for d in everything[: 2 + len(rest)]]
    assert client.get("/api/documents?limit=0", headers=auth_headers).status_code == 422


def test_upload_rejects_files_that_do_not_match_their_extension(client, auth_headers):
    resp = client.post(
        "/api/documents/upload",
        files={"file": ("fake.pdf", b"this is not a pdf", "application/pdf")},
        headers=auth_headers,
    )
    assert resp.status_code == 422

    empty = client.post(
        "/api/documents/upload",
        files={"file": ("empty.txt", b"", "text/plain")},
        headers=auth_headers,
    )
    assert empty.status_code == 422
