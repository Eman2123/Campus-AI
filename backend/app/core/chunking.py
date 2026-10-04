import re

from app.core.config import settings

_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def _split_sentences(paragraph: str) -> list[str]:
    return [s for s in _SENTENCE_SPLIT.split(paragraph.strip()) if s]


def chunk_text(text: str, chunk_size: int | None = None, overlap: int | None = None) -> list[str]:
    """Paragraph/sentence-aware chunking (Day 21 re-chunking pass).

    Packs whole sentences into each chunk up to `chunk_size` words,
    carrying the last `overlap` words forward into the next chunk for
    continuity — replacing Day 17's plain word-count sliding window,
    which would cut chunks off mid-sentence. A chunk that starts or ends
    mid-thought is a worse match for a semantically complete question,
    so this should improve retrieval quality without touching any
    caller (same signature, same list-of-strings return).

    A single sentence longer than `chunk_size` on its own (rare, but
    possible — a run-on line with no punctuation) falls back to a plain
    word-window split for just that sentence, so nothing regresses on
    pathological input. A final chunk shorter than MIN_CHUNK_WORDS gets
    merged into the previous one rather than standing alone.
    """
    chunk_size = settings.CHUNK_SIZE_WORDS if chunk_size is None else chunk_size
    overlap = settings.CHUNK_OVERLAP_WORDS if overlap is None else overlap
    min_words = min(settings.MIN_CHUNK_WORDS, chunk_size)

    paragraphs = [p for p in _PARAGRAPH_SPLIT.split(text) if p.strip()]
    if not paragraphs:
        return []

    sentences: list[str] = []
    for paragraph in paragraphs:
        sentences.extend(_split_sentences(paragraph))
    if not sentences:
        return []

    chunks: list[str] = []
    current_words: list[str] = []

    def flush() -> None:
        if current_words:
            chunks.append(" ".join(current_words))

    for sentence in sentences:
        sentence_words = sentence.split()
        if not sentence_words:
            continue

        if len(sentence_words) > chunk_size:
            # This one sentence alone is bigger than a whole chunk.
            # Flush whatever's pending, then word-window split just this
            # sentence on its own.
            flush()
            current_words = []
            step = max(chunk_size - overlap, 1)
            start = 0
            while start < len(sentence_words):
                end = start + chunk_size
                chunks.append(" ".join(sentence_words[start:end]))
                if end >= len(sentence_words):
                    # This window already reached the end — advancing by
                    # `step` here (Day 17's original logic did exactly
                    # this) would still satisfy `start < len(...)` when
                    # step < chunk_size and produce a redundant, tiny,
                    # mostly-overlapping tail window. Stop instead.
                    break
                start += step
            continue

        if current_words and len(current_words) + len(sentence_words) > chunk_size:
            flush()
            current_words = current_words[-overlap:] if overlap else []

        current_words.extend(sentence_words)

    flush()

    if len(chunks) >= 2 and len(chunks[-1].split()) < min_words:
        chunks[-2] = chunks[-2] + " " + chunks[-1]
        chunks.pop()

    return chunks
