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


def get_embeddings(texts: list[str], batch_size: int | None = None) -> list[list[float]]:
    """Embeds many texts with ONE API request per batch (default
    EMBEDDING_BATCH_SIZE inputs), preserving order. This is a blocking call:
    async code must run it with asyncio.to_thread."""
    if not texts:
        return []
    if not settings.AIML_API_KEY:
        return [_fallback_embedding(t) for t in texts]

    size = batch_size or settings.EMBEDDING_BATCH_SIZE
    client = get_llm_client()
    vectors: list[list[float]] = []
    for start in range(0, len(texts), size):
        batch = texts[start : start + size]
        try:
            response = client.embeddings.create(model=settings.AIML_EMBEDDING_MODEL, input=batch)
            # Providers return one item per input, tagged with its index;
            # sort so the order always matches the inputs.
            ordered = sorted(response.data, key=lambda item: getattr(item, "index", 0))
            vectors.extend(item.embedding for item in ordered)
        except Exception as exc:
            logger.warning("AIML embedding call failed, using fallback: %s", exc)
            vectors.extend(_fallback_embedding(t) for t in batch)
    return vectors


def get_embedding(text: str) -> list[float]:
    return get_embeddings([text])[0]
