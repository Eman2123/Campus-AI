"""GDPR right of access / portability: GET /api/auth/me/export."""
import uuid
from datetime import datetime, timedelta, timezone

from tests.helpers import wait_for_document
from tests.test_schedule import _create_deadline_via_chat


def _signup(client):
    email = f"export-{uuid.uuid4()}@campus.ai"
    resp = client.post("/api/auth/signup", json={"email": email, "password": "testpass123", "name": "Ex Porter"})
    assert resp.status_code == 201
    return email, {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_export_requires_sign_in(client):
    assert client.get("/api/auth/me/export").status_code in (401, 403)


def test_export_contains_the_users_data_and_nothing_secret(client):
    email, headers = _signup(client)
    client.post("/api/chat", json={"message": "explain gravity please", "session_id": str(uuid.uuid4())}, headers=headers)
    upload = client.post(
        "/api/documents/upload",
        files={"file": ("notes.txt", b"Cells divide by mitosis. " * 40, "text/plain")},
        headers=headers,
    )
    assert upload.status_code == 201
    wait_for_document(client, headers, upload.json()["id"])
    _create_deadline_via_chat(client, headers, "Chemistry Exam", datetime.now(timezone.utc) + timedelta(days=3))

    resp = client.get("/api/auth/me/export", headers=headers)
    assert resp.status_code == 200
    assert "attachment" in resp.headers["content-disposition"]
    data = resp.json()

    assert data["account"]["email"] == email and data["account"]["name"] == "Ex Porter"
    assert "settings" in data["account"]
    texts = [m["content"] for c in data["conversations"] for m in c["messages"]]
    assert "explain gravity please" in texts
    assert [d["filename"] for d in data["documents"]] == ["notes.txt"]
    assert any("chemistry" in item["title"].lower() for item in data["schedule"]), data["schedule"]

    raw = resp.text
    assert "password_hash" not in raw and "hash" not in data["account"]


def test_export_never_includes_another_users_data(client):
    _, headers_a = _signup(client)
    _, headers_b = _signup(client)
    client.post("/api/chat", json={"message": "SECRET of user A", "session_id": str(uuid.uuid4())}, headers=headers_a)

    data_b = client.get("/api/auth/me/export", headers=headers_b).json()
    assert data_b["conversations"] == []
    assert "SECRET of user A" not in str(data_b)
