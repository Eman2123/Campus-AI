"""Day 17 — Chunking + embeddings pipeline (pgvector)."""
import uuid

from sqlalchemy import select

from app.core.chunking import chunk_text
from app.core.embeddings import get_embedding
from app.core.text_extraction import extract_text
from app.models.document_chunk import DocumentChunk


def test_chunk_text_splits_with_overlap():
    words = [f"word{i}" for i in range(700)]
    text = " ".join(words)
    chunk_size, overlap = 300, 50
    chunks = chunk_text(text, chunk_size=chunk_size, overlap=overlap)

    assert len(chunks) > 1
    # the last `overlap` words of chunk N must equal the first `overlap`
    # words of chunk N+1
    chunk0_words = chunks[0].split()
    chunk1_words = chunks[1].split()
    assert chunk0_words[-overlap:] == chunk1_words[:overlap]


def test_chunk_text_handles_empty_input():
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_extract_text_plain_formats():
    assert extract_text(b"hello world", "notes.txt") == "hello world"
    assert extract_text(b"# heading\ncontent", "notes.md") == "# heading\ncontent"


def test_get_embedding_returns_correct_dimension():
    from app.core.config import settings

    embedding = get_embedding("some sample text")
    assert len(embedding) == settings.EMBEDDING_DIM
    assert all(isinstance(x, float) for x in embedding)


def test_upload_triggers_chunking_and_embedding(client, auth_headers):
    text = " ".join(["Photosynthesis converts light into chemical energy."] * 60)
    resp = client.post(
        "/api/documents/upload",
        files={"file": (f"notes-{uuid.uuid4()}.txt", text.encode(), "text/plain")},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    doc_id = resp.json()["id"]

    # TestClient runs BackgroundTasks synchronously, so by the time the
    # response above is returned, processing has already completed.
    listed = client.get("/api/documents", headers=auth_headers).json()
    doc = next(d for d in listed if d["id"] == doc_id)
    assert doc["embedding_status"] == "ready"
