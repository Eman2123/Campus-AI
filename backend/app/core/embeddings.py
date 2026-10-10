import hashlib
import logging
import random

from app.core.config import settings
from app.core.llm import get_llm_client

logger = logging.getLogger("campus_ai.embeddings")


def _fallback_embedding(text: str) -> list[float]:
    """Deterministic pseudo-embedding used only when AIML_API_KEY isn't
    set, so the RAG pipeline stays fully testable without real credentials.
    NOT semantically meaningful — retrieval quality with this fallback is
    undefined. Real embeddings require a real key."""
    seed = int(hashlib.sha256(text.encode()).hexdigest(), 16) % (2**32)
    rng = random.Random(seed)
    return [rng.uniform(-1, 1) for _ in range(settings.EMBEDDING_DIM)]


def get_embedding(text: str) -> list[float]:
    if not settings.AIML_API_KEY:
        return _fallback_embedding(text)

    try:
        client = get_llm_client()
        response = client.embeddings.create(model=settings.AIML_EMBEDDING_MODEL, input=text)
        return response.data[0].embedding
    except Exception as exc:
        logger.warning("AIML embedding call failed, using fallback: %s", exc)
        return _fallback_embedding(text)
