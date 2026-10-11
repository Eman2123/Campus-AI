"""Smoke tests against the REAL LLM / embedding API.

Skipped by default (see `[tool.pytest.ini_options]` in pyproject.toml). Run
them on purpose, when you want to know the provider, key and model really
work:

    pytest -m live

They need AIML_API_KEY in `.env`, cost a fraction of a cent, and assert only
things a healthy model gets right every time (a clear-cut message goes to the
right agent; embeddings have the right size), never exact wording.
"""
import uuid

import pytest

from app.core.config import settings
from app.core.embeddings import get_embedding
from app.agents.supervisor import classify_intent_llm

pytestmark = pytest.mark.live


@pytest.fixture(autouse=True)
def _need_a_real_key():
    if not settings.AIML_API_KEY:
        pytest.skip("AIML_API_KEY is not set")


def test_real_embedding_has_the_configured_size():
    vector = get_embedding("Organic chemistry reaction mechanisms")
    assert len(vector) == settings.EMBEDDING_DIM


@pytest.mark.parametrize(
    "message, expected",
    [
        ("Quiz me on chapter 3 of my biology notes", "quiz"),
        ("Make flashcards for the French Revolution", "flashcard"),
    ],
)
def test_real_llm_routes_clear_cut_messages(message, expected):
    assert classify_intent_llm(message) == expected


def test_chat_roundtrip_with_the_real_llm(client, auth_headers):
    resp = client.post(
        "/api/chat",
        json={"message": "Explain photosynthesis in one sentence.", "session_id": f"live-{uuid.uuid4()}"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"].strip()
    assert "[stub" not in body["reply"]  # a stub reply would mean the key was ignored
