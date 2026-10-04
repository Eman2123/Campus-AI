"""Day 21 — retrieval-quality tuning: a relevance threshold on top of
plain top-k similarity search, active only when AIML_API_KEY is set
(see the comment on DOCUMENT_MAX_COSINE_DISTANCE and retrieve_chunks for
why: the no-key fallback embedding is random noise, so thresholding its
distances would be meaningless). Embeddings are mocked here to force a
controlled, deterministic distance rather than relying on real
semantic similarity.
"""
import uuid
from unittest.mock import patch

from app.agents.document import NO_RELEVANT_CHUNKS_REPLY
from app.core.config import settings


def _orthogonal_embedding_fn(marker_word: str):
    """Returns a fake get_embedding that puts `marker_word`-containing
    text on one standard basis axis and everything else on a different,
    orthogonal one — guaranteeing cosine distance 1.0 between them,
    regardless of EMBEDDING_DIM."""

    def fake_get_embedding(text: str) -> list[float]:
        dim = settings.EMBEDDING_DIM
        vec = [0.0] * dim
        vec[0 if marker_word in text.lower() else 1] = 1.0
        return vec

    return fake_get_embedding


def test_irrelevant_document_is_filtered_out_when_a_real_key_is_configured(client, auth_headers):
    fake_embed = _orthogonal_embedding_fn("photosynthesis")

    with patch.object(settings, "AIML_API_KEY", "fake-key-for-test"), \
         patch("app.core.rag_pipeline.get_embedding", side_effect=fake_embed), \
         patch("app.agents.document.get_embedding", side_effect=fake_embed), \
         patch("app.core.subject_classifier.chat_completion", return_value="Biology"):

        upload_resp = client.post(
            "/api/documents/upload",
            files={
                "file": (
                    "photosynthesis-notes.txt",
                    (" ".join(["Photosynthesis converts sunlight into chemical energy."] * 20)).encode(),
                    "text/plain",
                )
            },
            headers=auth_headers,
        )
        assert upload_resp.status_code == 201, upload_resp.text
        assert upload_resp.json()["embedding_status"] == "ready"

        # A completely unrelated query lands on the orthogonal axis —
        # cosine distance 1.0, well past DOCUMENT_MAX_COSINE_DISTANCE (0.9).
        resp = client.post(
            "/api/chat",
            json={
                "message": "what's the capital of a country I haven't mentioned",
                "session_id": f"day21-{uuid.uuid4()}",
            },
            headers=auth_headers,
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["agent_used"] == "document"
    assert body["reply"] == NO_RELEVANT_CHUNKS_REPLY
