"""Day 25 — end-to-end testing of the automation tools.

Days 20-24 each got their own focused tests (test_schedule.py,
test_digest.py, test_file_organizer.py, test_connector_wiring.py). This
file instead walks one continuous student journey through all of them
together — upload, auto-sort, plan, export, remind, digest, and answer —
the way an actual session would touch them, to catch anything that only
shows up when the pieces are chained rather than tested in isolation.
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from icalendar import Calendar

from app.agents.document import NO_DOCUMENTS_REPLY


def test_full_automation_journey(client, auth_headers):
    # --- 1. Upload a document — File Organizer classifies it in the background ---
    upload_resp = client.post(
        "/api/documents/upload",
        files={
            "file": (
                "chemistry-notes.txt",
                (" ".join(["Organic chemistry covers reaction mechanisms and molecule structure."] * 30)).encode(),
                "text/plain",
            )
        },
        headers=auth_headers,
    )
    assert upload_resp.status_code == 201, upload_resp.text
    document = upload_resp.json()
    assert document["embedding_status"] == "ready"
    assert document["organize_status"] in ("organized", "skipped")
    assert document["subject"] is not None
    chem_subject_matched = "chem" in document["subject"].lower()

    # --- 2. Ask the Planner for a near-term deadline (hits both the
    #        reminder window (48h) and the digest window (7 days)) ---
    near_due = (datetime.now(timezone.utc) + timedelta(hours=36)).strftime("%Y-%m-%d")
    near_resp = client.post(
        "/api/chat",
        json={
            "message": f"help me plan for my Chemistry final on {near_due}",
            "session_id": f"day25-{uuid.uuid4()}",
        },
        headers=auth_headers,
    )
    assert near_resp.status_code == 200
    near_body = near_resp.json()
    assert near_body["agent_used"] == "planner"
    assert "export.ics" in near_body["reply"]
    if chem_subject_matched:
        # Day 24 wiring: Planner should point back at the material
        # already uploaded for this subject.
        assert "tagged" in near_body["reply"].lower()

    # --- 3. Ask the Planner for a farther-out deadline too, to exercise
    #        the backward study-session generation alongside the export ---
    far_due = (datetime.now(timezone.utc) + timedelta(days=20)).strftime("%Y-%m-%d")
    far_resp = client.post(
        "/api/chat",
        json={"message": f"help me plan for my Physics final on {far_due}", "session_id": f"day25-{uuid.uuid4()}"},
        headers=auth_headers,
    )
    assert far_resp.status_code == 200
    assert far_resp.json()["agent_used"] == "planner"

    # --- 4. Calendar Export — both deadlines (and likely some Physics
    #        study sessions) should show up as real events ---
    export_resp = client.get("/api/schedule/export.ics", headers=auth_headers)
    assert export_resp.status_code == 200
    cal = Calendar.from_ical(export_resp.content)
    events = list(cal.walk("VEVENT"))
    assert len(events) >= 2  # at minimum, the two deadlines themselves

    # --- 5. Deadline Reminders — only the near-term deadline is inside
    #        the 48h window; must be idempotent on a second call ---
    with patch("app.core.reminders.send_email") as mock_reminder_email:
        first_remind = client.post("/api/schedule/remind-me", headers=auth_headers)
        assert first_remind.status_code == 200
        assert first_remind.json()["reminders_sent"] == 1
        assert mock_reminder_email.call_count == 1

        second_remind = client.post("/api/schedule/remind-me", headers=auth_headers)
        assert second_remind.json()["reminders_sent"] == 0  # already reminded

    # --- 6. Email Digest — not gated like reminders, and covers a wider
    #        window, so it should still find something to send ---
    with patch("app.core.digest.send_email") as mock_digest_email:
        digest_resp = client.post("/api/schedule/digest-me", headers=auth_headers)
        assert digest_resp.status_code == 200
        assert digest_resp.json()["digests_sent"] == 1
        assert mock_digest_email.call_count == 1

    # --- 7. Document Agent — answers grounded in the uploaded material ---
    doc_resp = client.post(
        "/api/chat",
        json={
            "message": "using my chemistry notes, what do they cover?",
            "session_id": f"day25-{uuid.uuid4()}",
        },
        headers=auth_headers,
    )
    assert doc_resp.status_code == 200
    doc_body = doc_resp.json()
    assert doc_body["agent_used"] == "document"
    assert doc_body["reply"] != NO_DOCUMENTS_REPLY

    # --- 8. Deleting the document doesn't touch the schedule/export —
    #        they're independent resources ---
    delete_resp = client.delete(f"/api/documents/{document['id']}", headers=auth_headers)
    assert delete_resp.status_code == 204

    export_after_delete = client.get("/api/schedule/export.ics", headers=auth_headers)
    assert export_after_delete.status_code == 200
    events_after_delete = list(Calendar.from_ical(export_after_delete.content).walk("VEVENT"))
    assert len(events_after_delete) == len(events)  # unaffected by document deletion

    # ...but Document Agent now has nothing left to search.
    doc_resp_after_delete = client.post(
        "/api/chat",
        json={"message": "using my chemistry notes, what do they cover?", "session_id": f"day25-{uuid.uuid4()}"},
        headers=auth_headers,
    )
    assert doc_resp_after_delete.json()["reply"] == NO_DOCUMENTS_REPLY


def test_delete_file_from_drive_stub_is_a_safe_no_op():
    """Covers the Day 25 bug fix directly: deleting a document with no
    Drive service account configured should log and return quietly,
    never raise — the document delete route calls this unconditionally
    whenever drive_file_id is set."""
    from app.core.google_drive import delete_file_from_drive

    delete_file_from_drive("some-fake-drive-file-id")  # must not raise
