import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.message import Message
from app.models.session import Session

# Fixed, arbitrary namespace for deriving a stable UUID from a non-UUID
# session_id string (see resolve_session_uuid).
SESSION_ID_NAMESPACE = uuid.UUID("a97af5c3-1b1e-4f6b-9b0a-1f9a9c6e6f10")


def resolve_session_uuid(user_id: uuid.UUID, raw_session_id: str) -> uuid.UUID:
    """The `sessions` table needs a real UUID primary key, but
    `session_id` from callers is just a string (it's primarily
    LangGraph's thread_id, Day 13, which only needs to be *some* stable
    string). The real frontend (Day 28+) always sends one from
    crypto.randomUUID(), so the common case just parses straight
    through — which matters: using the same value for both the DB
    session id and the LangGraph thread_id means resuming an old
    session from the sidebar (Day 31) also resumes the agent's own
    checkpointed memory, not just the displayed history.

    Older/test callers that pass an arbitrary non-UUID string (a
    hardcoded "dev-session" default, a test's `f"day30-{uuid.uuid4()}"`
    prefix) still work — this derives a stable, per-user UUID instead
    of crashing. Those callers just don't get the identity between the
    two ids, which doesn't matter for them since they aren't resuming
    conversations across requests through this table.
    """
    try:
        return uuid.UUID(raw_session_id)
    except ValueError:
        return uuid.uuid5(SESSION_ID_NAMESPACE, f"{user_id}:{raw_session_id}")


def thread_id_for(user_id: uuid.UUID | str, raw_session_id: str) -> str:
    """The LangGraph thread_id for a chat: "<user_id>:<session uuid>".

    It used to be the raw client-supplied session id, so two users sending the
    same id (or the shared "dev-session" default) read and wrote one
    checkpointed conversation. Including the user id makes a thread belong to
    exactly one person. The session part is the canonical UUID (the same one
    the `sessions` table uses) so deleting a chat can rebuild the id from the
    database row.
    """
    uid = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
    return f"{uid}:{resolve_session_uuid(uid, raw_session_id)}"


def thread_ids_for_session(user_id: uuid.UUID | str, session_uuid: uuid.UUID | str) -> list[str]:
    """Every checkpoint thread a stored session may have: the current
    "<user>:<session>" id, plus the bare session UUID that older versions used
    (so deleting a chat also clears checkpoints written before this change)."""
    return [f"{user_id}:{session_uuid}", str(session_uuid)]


def _not_found() -> HTTPException:
    # 404, not 403: don't confirm that somebody else's session id exists.
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")


async def ensure_session_available(user_id: uuid.UUID, raw_session_id: str) -> None:
    """Raises 404 if this session id already belongs to another user. Chat
    routes call it BEFORE running the graph, so a foreign id is refused
    outright instead of the reply being generated and then silently not saved."""
    session_uuid = resolve_session_uuid(user_id, raw_session_id)
    async with AsyncSessionLocal() as db:
        owner = (await db.execute(select(Session.user_id).where(Session.id == session_uuid))).scalar_one_or_none()
    if owner is not None and owner != user_id:
        raise _not_found()


async def get_or_create_session(db: AsyncSession, user_id: uuid.UUID, raw_session_id: str) -> Session:
    session_uuid = resolve_session_uuid(user_id, raw_session_id)

    result = await db.execute(select(Session).where(Session.id == session_uuid))
    session = result.scalar_one_or_none()
    if session is not None:
        if session.user_id != user_id:
            raise _not_found()
        return session

    session = Session(id=session_uuid, user_id=user_id)
    db.add(session)
    await db.flush()  # assign it before any Message rows FK to it in the same transaction
    return session


async def save_turn(
    db: AsyncSession,
    session: Session,
    user_message: str,
    assistant_reply: str,
    agent_used: str,
) -> None:
    """Persists one exchange (the student's message + the agent's reply)
    as two Message rows. Called from /chat, /chat/stream, and
    /voice/chat — all three produce exactly this shape."""
    db.add(Message(session_id=session.id, role="user", content=user_message))
    db.add(Message(session_id=session.id, role="assistant", content=assistant_reply, agent_used=agent_used))
    await db.commit()
