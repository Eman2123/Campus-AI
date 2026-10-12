"""Fix 3 — blocking work must not run on the event loop.

One slow upload used to freeze every other request, because file reads, text
extraction, chunking, embedding calls and email sends ran directly inside
async functions. These tests check that each of them now runs in a worker
thread (where there is no running event loop), that embeddings are batched,
that the OpenAI client is reused, and that oversized documents are rejected.
"""
import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

from app.core import embeddings, llm
from app.core.config import settings
from tests.helpers import wait_for_document
from tests.test_schedule import _create_deadline_via_chat


def _on_event_loop() -> bool:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return False
    return True


def _recording(original, seen: dict, name: str):
    def wrapper(*args, **kwargs):
        seen[name] = _on_event_loop()
        return original(*args, **kwargs)

    return wrapper


def test_document_processing_runs_off_the_event_loop(client, auth_headers):
    from app.core import rag_pipeline

    seen: dict[str, bool] = {}
    text = " ".join(["Photosynthesis converts light into chemical energy."] * 60)

    with patch("app.core.rag_pipeline.read_file", _recording(rag_pipeline.read_file, seen, "read_file")), patch(
        "app.core.rag_pipeline.extract_text", _recording(rag_pipeline.extract_text, seen, "extract_text")
    ), patch("app.core.rag_pipeline.chunk_text", _recording(rag_pipeline.chunk_text, seen, "chunk_text")), patch(
        "app.core.rag_pipeline.get_embeddings", _recording(rag_pipeline.get_embeddings, seen, "get_embeddings")
    ):
        resp = client.post(
            "/api/documents/upload",
            files={"file": (f"notes-{uuid.uuid4()}.txt", text.encode(), "text/plain")},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        doc = wait_for_document(client, auth_headers, resp.json()["id"])

    assert doc["embedding_status"] == "ready"
    assert set(seen) == {"read_file", "extract_text", "chunk_text", "get_embeddings"}
    assert not any(seen.values()), f"these ran on the event loop: {[k for k, v in seen.items() if v]}"


def test_file_organizer_reads_the_file_off_the_event_loop(client, auth_headers):
    from app.core import file_organizer

    seen: dict[str, bool] = {}
    with patch(
        "app.core.file_organizer.extract_text", _recording(file_organizer.extract_text, seen, "extract_text")
    ), patch("app.core.subject_classifier.chat_completion", return_value="Biology"):
        resp = client.post(
            "/api/documents/upload",
            files={"file": (f"bio-{uuid.uuid4()}.txt", b"Cells divide by mitosis. " * 40, "text/plain")},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        wait_for_document(client, auth_headers, resp.json()["id"])

    assert seen.get("extract_text") is False


def test_reminder_and_digest_emails_are_sent_off_the_event_loop(client, auth_headers):
    seen: dict[str, bool] = {}

    def fake_send(*args, **kwargs):
        seen["last"] = _on_event_loop()

    due = datetime.now(timezone.utc) + timedelta(hours=20)
    _create_deadline_via_chat(client, auth_headers, "Chemistry Exam", due)

    with patch("app.core.reminders.send_email", fake_send):
        assert client.post("/api/schedule/remind-me", headers=auth_headers).json()["reminders_sent"] == 1
    assert seen["last"] is False

    seen.clear()
    with patch("app.core.digest.send_email", fake_send):
        assert client.post("/api/schedule/digest-me", headers=auth_headers).json()["digests_sent"] == 1
    assert seen["last"] is False


def test_embeddings_are_requested_in_batches_and_keep_their_order():
    calls: list[int] = []

    class FakeEmbeddings:
        def create(self, model, input):
            calls.append(len(input))
            # Return items shuffled, tagged with their index, like a real API may.
            items = [SimpleNamespace(index=i, embedding=[float(len(text))] * 3) for i, text in enumerate(input)]
            return SimpleNamespace(data=list(reversed(items)))

    texts = ["x" * n for n in range(1, 151)]  # 150 distinct lengths
    with patch.object(settings, "AIML_API_KEY", "fake-key"), patch.object(settings, "EMBEDDING_BATCH_SIZE", 64), patch(
        "app.core.embeddings.get_llm_client", return_value=SimpleNamespace(embeddings=FakeEmbeddings())
    ):
        vectors = embeddings.get_embeddings(texts)

    assert calls == [64, 64, 22]  # 3 requests, not 150
    assert [v[0] for v in vectors] == [float(len(t)) for t in texts]  # order preserved


def test_llm_client_is_reused_between_calls():
    with patch.object(settings, "AIML_API_KEY", "fake-key"):
        assert llm.get_llm_client() is llm.get_llm_client()


def test_a_document_with_too_many_chunks_is_rejected(client, auth_headers):
    text = " ".join(f"word{i}" for i in range(3000))  # ~10 chunks at the default size
    with patch.object(settings, "MAX_CHUNKS_PER_DOCUMENT", 3):
        resp = client.post(
            "/api/documents/upload",
            files={"file": (f"huge-{uuid.uuid4()}.txt", text.encode(), "text/plain")},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        doc = wait_for_document(client, auth_headers, resp.json()["id"])

    assert doc["embedding_status"] == "failed"
