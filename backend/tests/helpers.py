"""Shared test helpers."""
import time


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
