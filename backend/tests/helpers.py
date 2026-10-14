"""Shared test helpers."""
import time
from unittest.mock import patch


def wait_for_document(client, headers, document_id: str, timeout: float = 15.0) -> dict:
    """The upload response is built *before* the background tasks (embedding,
    File Organizer) run, so it always says "pending". Poll the document list
    until both have settled and return the final row."""
    deadline = time.monotonic() + timeout
    doc: dict = {}
    while time.monotonic() < deadline:
        listed = client.get("/api/documents", headers=headers).json()
        doc = next((d for d in listed if d["id"] == document_id), {})
        if doc and doc["embedding_status"] != "pending" and doc["organize_status"] != "pending":
            return doc
        time.sleep(0.2)
    return doc


def make_admin_headers(client, email: str) -> dict:
    """Creates an admin the way production does: the address is listed in
    ADMIN_EMAILS and the person signs in with Google (which verifies the
    email). Password signup never grants admin, so tests can't use it."""
    from app.core.config import settings
    from app.core.google_auth import GoogleProfile

    async def fake_verify(credential: str) -> GoogleProfile:
        return GoogleProfile(email=email, name="Test Admin")

    with patch.object(settings, "ADMIN_EMAILS", [email]), patch.object(
        settings, "GOOGLE_CLIENT_ID", "test-client"
    ), patch("app.api.routes.auth.verify_google_id_token", fake_verify):
        resp = client.post("/api/auth/google", json={"credential": "a" * 40})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
