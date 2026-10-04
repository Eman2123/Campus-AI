import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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


async def get_or_create_session(db: AsyncSession, user_id: uuid.UUID, raw_session_id: str) -> Session:
    session_uuid = resolve_session_uuid(user_id, raw_session_id)

    result = await db.execute(select(Session).where(Session.id == session_uuid))
    session = result.scalar_one_or_none()
    if session is not None:
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
