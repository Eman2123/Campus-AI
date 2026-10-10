"""Day 23 — File Organizer connector: auto-sort uploaded docs by subject/tag.

classify_subject_heuristic is tested directly (pure function, no DB/LLM).
The end-to-end classify-and-file behavior goes through the real upload
endpoint, same pattern as test_rag_pipeline.py — TestClient runs
BackgroundTasks synchronously, so organize_status is already resolved by
the time upload() returns. No GOOGLE_SERVICE_ACCOUNT_FILE is expected in
test environments, so Drive-dependent assertions are written to hold
under both the stub ("skipped") and a real Drive connection ("organized").
"""
from app.core.subject_classifier import classify_subject_heuristic


def test_classify_subject_heuristic_matches_known_keywords():
    assert classify_subject_heuristic("chemistry-notes.txt", "") == "Chemistry"
    assert classify_subject_heuristic("notes.txt", "the mitochondria and cell genetics") == "Biology"
    assert classify_subject_heuristic("essay.txt", "the French Revolution and the empire that followed") == "History"


def test_classify_subject_heuristic_defaults_to_general_when_nothing_matches():
    assert classify_subject_heuristic("upload.txt", "just some ordinary words about my day") == "General"


def _upload(client, headers, filename: str, text: str):
    resp = client.post(
        "/api/documents/upload",
        files={"file": (filename, text.encode(), "text/plain")},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_upload_classifies_subject_and_resolves_organize_status(client, auth_headers):
    body = _upload(
        client,
        auth_headers,
        "chemistry-notes.txt",
        " ".join(["Organic chemistry reactions and molecule structure notes."] * 20),
    )
    assert body["organize_status"] in ("organized", "skipped")
    assert body["subject"] is not None
    assert "chem" in body["subject"].lower()

    if body["organize_status"] == "organized":
        assert body["drive_file_id"] is not None
        assert body["drive_folder_path"] is not None
    else:
        assert body["drive_file_id"] is None
        assert body["drive_folder_path"] is None


def test_organize_status_reflects_in_document_list(client, auth_headers):
    uploaded = _upload(client, auth_headers, "history-essay.txt", " ".join(["The French Revolution and its empire."] * 20))

    listed = client.get("/api/documents", headers=auth_headers).json()
    doc = next(d for d in listed if d["id"] == uploaded["id"])
    assert doc["organize_status"] in ("organized", "skipped")
    assert "hist" in doc["subject"].lower()
