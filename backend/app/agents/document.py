import asyncio
import logging

from sqlalchemy import select

from app.agents.state import AgentState
from app.agents.supervisor import get_last_user_text
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.embeddings import get_embedding
from app.core.llm import chat_completion
from app.models.document import Document
from app.models.document_chunk import DocumentChunk

logger = logging.getLogger("campus_ai.agents.document")

DOCUMENT_SYSTEM_PROMPT = (
    "You are Campus AI's Document agent. You answer questions using ONLY the "
    "excerpts from the student's own uploaded documents given below — never "
    "your own outside knowledge, even if you happen to know the answer. Each "
    "excerpt is labeled with the filename (and subject, if known) it came "
    "from; when you use one, say which file it's from. If the excerpts "
    "don't contain enough information to answer, say so plainly and "
    "suggest the student upload a document that covers it — do not guess "
    "or fill gaps from general knowledge.\n\n"
    "Excerpts:\n{context}"
)

NO_DOCUMENTS_REPLY = (
    "You don't have any documents uploaded yet (or none have finished "
    "processing) for me to search. Upload a file first, then ask again."
)

# Day 21 addition: distinct from NO_DOCUMENTS_REPLY — this is for when the
# student *does* have searchable documents, but nothing in them scored
# close enough to be worth answering from (see DOCUMENT_MAX_COSINE_DISTANCE).
NO_RELEVANT_CHUNKS_REPLY = (
    "You have documents uploaded, but nothing in them looks relevant to "
    "that question. Try rephrasing, or upload something that covers it."
)


async def _matching_subject(user_id: str, query: str) -> str | None:
    """Day 24: wires the File Organizer connector's subject tags (Day 23)
    into retrieval. If the student names a subject they already have
    tagged documents in (e.g. "using my chemistry notes..."), scope
    retrieval to just that subject instead of searching everything —
    cuts down on cross-subject noise when a student is working on more
    than one class."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Document.subject)
            .where(
                Document.user_id == user_id,
                Document.embedding_status == "ready",
                Document.subject.is_not(None),
                Document.subject != "General",
            )
            .distinct()
        )
        subjects = [row[0] for row in result.all()]

    query_lower = query.lower()
    for subject in subjects:
        if subject.lower() in query_lower:
            return subject
    return None


async def retrieve_chunks(
    user_id: str, query: str, top_k: int | None = None
) -> tuple[list[tuple[str, str | None, str]], bool]:
    """Returns (chunks, had_candidates).

    `chunks` is up to `top_k` (filename, subject, chunk_content) triples,
    nearest-first, restricted to this user's own documents that have
    finished embedding — and, when the question names a subject the
    student already has tagged documents in, to that subject alone (see
    _matching_subject). Cosine distance via pgvector — lower is more
    similar.

    `had_candidates` is True whenever the raw query returned at least one
    chunk before any relevance filtering — it's what tells document_node
    apart "you have nothing uploaded" from "you have things uploaded but
    none of them are relevant enough," which need different replies.

    Day 21 retrieval-quality tuning: chunks farther than
    DOCUMENT_MAX_COSINE_DISTANCE get dropped, but only when AIML_API_KEY
    is set. The no-key fallback embedding is per-text random noise (see
    app/core/embeddings.py) — its distances carry no semantic signal, so
    thresholding them would reject good and bad matches at random rather
    than improve anything.
    """
    top_k = top_k or settings.DOCUMENT_RETRIEVAL_TOP_K
    query_embedding = await asyncio.to_thread(get_embedding, query)
    subject_filter = await _matching_subject(user_id, query)

    distance_expr = DocumentChunk.embedding.cosine_distance(query_embedding)

    async with AsyncSessionLocal() as db:
        stmt = (
            select(Document.filename, Document.subject, DocumentChunk.content, distance_expr.label("distance"))
            .join(DocumentChunk, DocumentChunk.document_id == Document.id)
            .where(Document.user_id == user_id, Document.embedding_status == "ready")
        )
        if subject_filter is not None:
            stmt = stmt.where(Document.subject == subject_filter)
        stmt = stmt.order_by(distance_expr).limit(top_k)

        result = await db.execute(stmt)
        rows = result.all()

    had_candidates = len(rows) > 0

    if settings.AIML_API_KEY:
        rows = [row for row in rows if row.distance <= settings.DOCUMENT_MAX_COSINE_DISTANCE]

    chunks = [(filename, subject, content) for filename, subject, content, _distance in rows]
    return chunks, had_candidates


def _build_context(chunks: list[tuple[str, str | None, str]]) -> str:
    labels = []
    for filename, subject, content in chunks:
        label = f"{filename} \u2014 {subject}" if subject else filename
        labels.append(f"[{label}]\n{content}")
    return "\n\n".join(labels)


async def document_node(state: AgentState) -> dict:
    user_text = get_last_user_text(state)
    user_id = state.get("user_id")

    if not user_id:
        # Shouldn't happen via the real API (auth always sets user_id), but
        # keeps this node safe to call directly (e.g. in tests) without one.
        reply = NO_DOCUMENTS_REPLY
        return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "document"}

    try:
        chunks, had_candidates = await retrieve_chunks(user_id, user_text)
    except Exception as exc:
        logger.exception("document retrieval failed for user=%s: %s", user_id, exc)
        reply = f"[retrieval error, falling back to stub: {exc}]"
        return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "document"}

    if not chunks:
        reply = NO_RELEVANT_CHUNKS_REPLY if had_candidates else NO_DOCUMENTS_REPLY
        return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "document"}

    if settings.AIML_API_KEY:
        try:
            system_prompt = DOCUMENT_SYSTEM_PROMPT.format(context=_build_context(chunks))
            reply = await asyncio.to_thread(
                chat_completion,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_text},
                ],
            )
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "document"}
        except Exception as exc:
            reply = f"[AIML API error, falling back to stub: {exc}]"
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "document"}

    filenames = ", ".join(sorted({filename for filename, _subject, _content in chunks}))
    reply = (
        f"[stub — no AIML_API_KEY set] Found {len(chunks)} relevant excerpt(s) "
        f"in: {filenames}. The Document agent would answer grounded in these here."
    )
    return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "document"}
