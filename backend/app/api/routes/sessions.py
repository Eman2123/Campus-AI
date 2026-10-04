import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.message import Message
from app.models.session import Session
from app.models.user import User
from app.schemas.session import MessageOut, SessionOut

router = APIRouter()

PREVIEW_LENGTH = 80


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Day 31 — backs the history sidebar. Each session is previewed by
    its first user message (what the student actually asked, more
    useful for recognizing a conversation than a timestamp alone) and
    ordered by its most recent message, not its creation time — a
    session someone returns to and keeps talking in should stay near
    the top, not sink based on when it started."""
    result = await db.execute(
        select(Session)
        .where(Session.user_id == current_user.id)
        .options(selectinload(Session.messages))
    )
    sessions = result.scalars().all()

    out: list[SessionOut] = []
    for session in sessions:
        if not session.messages:
            continue  # created but nothing ever sent — shouldn't normally happen, but skip rather than show empty
        ordered = sorted(session.messages, key=lambda m: m.created_at)
        first_user_message = next((m.content for m in ordered if m.role == "user"), ordered[0].content)
        out.append(
            SessionOut(
                id=session.id,
                started_at=session.started_at,
                last_message_at=ordered[-1].created_at,
                preview=first_user_message[:PREVIEW_LENGTH],
                message_count=len(ordered),
            )
        )

    out.sort(key=lambda s: s.last_message_at, reverse=True)
    return out


@router.get("/sessions/{session_id}/messages", response_model=list[MessageOut])
async def get_session_messages(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Loads one session's full transcript — what the sidebar calls when
    a student clicks a past conversation. 404s (not 403) on someone
    else's session, so this doesn't confirm a given session id exists
    for another user."""
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(Message).where(Message.session_id == session_id).order_by(Message.created_at)
    )
    return result.scalars().all()
