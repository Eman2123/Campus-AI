import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.agent_usage import get_agent_usage_summary
from app.core.connector_status import get_connector_statuses
from app.core.database import get_db
from app.models.user import User
from app.schemas.admin import AdminUserOut, AgentUsageSummaryOut, ConnectorStatusOut

router = APIRouter()

MAX_USERS_RETURNED = 200


@router.get("/admin/ping")
async def admin_ping(current_user: User = Depends(require_admin)):
    """Day 34 — proves the role-gating works end to end: a non-admin
    gets 403 (via require_admin, defined since Day 5 but unused until
    now), an admin gets through. The real admin data endpoints — user
    list/search/disable (Day 35), usage analytics (Day 36), connector
    status (Day 37) — build on this same dependency; this route is
    deliberately just enough to verify the gate itself."""
    return {"status": "ok", "role": current_user.role}


@router.get("/admin/users", response_model=list[AdminUserOut])
async def list_users(
    q: str | None = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Day 35 — user management table. `q` filters by email substring
    (case-insensitive); omit it to list everyone, newest first, capped
    at MAX_USERS_RETURNED — a real usage-scale cap would want real
    pagination, but that's more than this student-count MVP needs yet.
    """
    stmt = select(User).order_by(User.created_at.desc())
    if q:
        stmt = stmt.where(User.email.ilike(f"%{q}%"))
    result = await db.execute(stmt.limit(MAX_USERS_RETURNED))
    return result.scalars().all()


MAX_ANALYTICS_WINDOW_HOURS = 24 * 30  # 30 days — well past "recent usage", short of unbounded


@router.get("/admin/analytics/agents", response_model=AgentUsageSummaryOut)
async def agent_analytics(
    hours: int = 24,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Day 36 — calls per agent and response times, the one remaining
    PRD item under 'agent usage analytics'. `hours` windows the summary
    (default last 24h, matching what an admin checking in on "how's it
    going today" would actually want); clamped rather than rejected
    outright for an out-of-range value, since a typo'd query param
    shouldn't 400 a dashboard that's otherwise fine to just clamp.
    """
    hours = max(1, min(hours, MAX_ANALYTICS_WINDOW_HOURS))
    by_agent = await get_agent_usage_summary(db, since_hours=hours)
    return AgentUsageSummaryOut(since_hours=hours, by_agent=by_agent)


@router.get("/admin/connectors/status", response_model=list[ConnectorStatusOut])
async def connector_status(current_user: User = Depends(require_admin)):
    """Day 37 — the last Phase 5 item: calendar export/email/storage
    health, plus the scheduled jobs that drive reminders and digests.
    No `db` dependency — every check here reads either static config
    (settings) or in-process state (the scheduler), not the database.
    """
    return get_connector_statuses()


async def _get_target_user(db: AsyncSession, user_id: uuid.UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/admin/users/{user_id}/disable", response_model=AdminUserOut)
async def disable_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Disabling takes effect immediately, not just on next sign in — see
    the is_active check in get_current_user (Day 35). An admin can't
    disable their own account: with a single admin, that would lock
    everyone out of /admin with no way back in short of a manual DB
    edit, which is a worse failure mode than just refusing the action.
    """
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't disable your own account")

    target = await _get_target_user(db, user_id)
    target.is_active = False
    await db.commit()
    await db.refresh(target)
    return target


@router.post("/admin/users/{user_id}/enable", response_model=AdminUserOut)
async def enable_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    target = await _get_target_user(db, user_id)
    target.is_active = True
    await db.commit()
    await db.refresh(target)
    return target