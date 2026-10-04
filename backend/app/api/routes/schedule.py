import logging

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.calendar_export import build_ics
from app.core.database import get_db
from app.core.digest import send_daily_digests
from app.core.reminders import send_deadline_reminders
from app.models.schedule import Schedule
from app.models.user import User
from app.schemas.schedule import ScheduleOut

router = APIRouter()
logger = logging.getLogger("campus_ai.schedule")


@router.get("/schedule", response_model=list[ScheduleOut])
async def list_schedule(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Day 32 — backs the calendar view. Read-only on purpose: the PRD
    task is a *view*, and editing/deleting individual schedule rows
    (distinct from deleting the source document, which never touches
    this table — see Day 25) isn't asked for here. Returns everything;
    a student's schedule is small enough that client-side month
    filtering is simpler than a query-param date-range API for now."""
    result = await db.execute(
        select(Schedule).where(Schedule.user_id == current_user.id).order_by(Schedule.due_date)
    )
    return result.scalars().all()


@router.get("/schedule/export.ics")
async def export_schedule_ics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """One-click ICS download of everything in the student's schedule
    (Planner-generated deadlines and study sessions alike) — the frontend's
    Day 31 download button hits this. No OAuth, no calendar-provider
    integration: the student imports the file into whatever calendar app
    they already use."""
    result = await db.execute(
        select(Schedule).where(Schedule.user_id == current_user.id).order_by(Schedule.due_date)
    )
    schedules = result.scalars().all()
    ics_bytes = build_ics(schedules)
    return Response(
        content=ics_bytes,
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=campus-ai-schedule.ics"},
    )


@router.post("/schedule/remind-me")
async def remind_me_now(current_user: User = Depends(get_current_user)):
    """Manually runs the same reminder sweep APScheduler runs daily (Day
    20), scoped to just this student's own upcoming deadlines. A real
    self-serve "resend that reminder" action — and, since it's scoped to
    the caller, safe to expose without admin gating (unlike an unscoped
    trigger, which could be used to spam every user's inbox on demand)."""
    sent = await send_deadline_reminders(user_id=str(current_user.id))
    return {"reminders_sent": sent}


@router.post("/schedule/digest-me")
async def digest_me_now(current_user: User = Depends(get_current_user)):
    """Manually sends today's Email Digest (Day 22) — everything due in
    the next DIGEST_LOOKAHEAD_DAYS — scoped to just this student. Same
    role as `remind-me`: a genuine "send it now" self-serve action, and
    the way this gets integration-tested without an unscoped trigger."""
    sent = await send_daily_digests(user_id=str(current_user.id))
    return {"digests_sent": sent}
