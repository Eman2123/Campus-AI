"""Day 21 — RAG retrieval quality tuning / re-chunking pass.

chunk_text is pure (no DB/LLM), so these are direct unit tests.
"""
from app.core.chunking import chunk_text


def test_does_not_split_mid_sentence():
    text = "First sentence here. Second sentence here. Third sentence here."
    chunks = chunk_text(text, chunk_size=5, overlap=0)
    for chunk in chunks:
        assert chunk.strip().endswith(".")
    # regression guard for a real bug found on Day 21: `overlap=0` was
    # being silently replaced by the config default via `overlap or
    # settings.CHUNK_OVERLAP_WORDS` (0 is falsy in Python), which broke
    # the sentence-accumulator's reset and made each chunk a growing
    # prefix of all the text seen so far instead of independent chunks.
    assert not any(
        other != chunk and other.startswith(chunk.rstrip("."))
        for chunk in chunks
        for other in chunks
    )


def test_respects_paragraph_boundaries_as_natural_breaks():
    text = "Para one sentence A. Para one sentence B.\n\nPara two sentence A."
    chunks = chunk_text(text, chunk_size=100, overlap=0)
    # Small chunk_size relative to content isn't the point here — with a
    # generous size everything fits in one chunk, so this just confirms
    # paragraphs don't crash the splitter or get silently dropped.
    joined = " ".join(chunks)
    assert "Para one sentence A." in joined
    assert "Para two sentence A." in joined


def test_overlap_carries_words_into_the_next_chunk():
    text = "One two three four. Five six seven eight. Nine ten eleven twelve."
    chunks = chunk_text(text, chunk_size=5, overlap=2)
    assert len(chunks) >= 2
    # last `overlap`-ish words of one chunk should reappear at the start
    # of the next (word-level, not exact since sentences are indivisible)
    first_tail = chunks[0].split()[-1]
    assert first_tail in chunks[1]


def test_oversized_single_sentence_falls_back_to_word_window_without_dangling_tiny_window():
    """Regression test for a Day 17 off-by-one: a sliding window whose
    step is smaller than its size could re-check `start < len(words)`
    after a window that already reached the end, producing a redundant
    near-duplicate tail window. Every emitted chunk should be genuinely
    new ground, and the last one should end exactly at the text's end."""
    words = [f"word{i}" for i in range(97)]  # no punctuation -> one giant "sentence"
    text = " ".join(words)
    chunks = chunk_text(text, chunk_size=50, overlap=10)

    assert chunks[-1].split()[-1] == "word96"  # covers all the way to the end
    # no chunk should be a pure subset of the words already covered by
    # the previous one ending at the same place (the bug's signature)
    seen_last_words = [c.split()[-1] for c in chunks]
    assert len(seen_last_words) == len(set(seen_last_words))


def test_trailing_tiny_chunk_gets_merged_into_previous():
    words = [f"word{i}" for i in range(45)]
    text = " ".join(words) + ". Tiny final bit."
    chunks = chunk_text(text, chunk_size=40, overlap=5)
    # the "Tiny final bit." sentence (3 words) is well under MIN_CHUNK_WORDS
    # and must not appear as its own standalone chunk
    assert not any(chunk.strip() == "Tiny final bit." for chunk in chunks)


def test_empty_and_whitespace_only_input_returns_no_chunks():
    assert chunk_text("") == []
    assert chunk_text("   \n\n  ") == []


def test_no_punctuation_text_still_chunks_via_word_window_fallback():
    text = " ".join(f"w{i}" for i in range(20))
    chunks = chunk_text(text, chunk_size=8, overlap=2)
    assert len(chunks) >= 2
    assert chunks[-1].split()[-1] == "w19"
