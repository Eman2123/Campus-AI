import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings
from app.core.digest import send_daily_digests
from app.core.reminders import send_deadline_reminders

logger = logging.getLogger("campus_ai.scheduler")

_scheduler: AsyncIOScheduler | None = None


def start_scheduler() -> AsyncIOScheduler:
    """Idempotent — safe to call more than once (e.g. TestClient re-entering
    the app's lifespan across a test session); returns the existing
    scheduler instead of starting a second one."""
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        send_deadline_reminders,
        trigger=CronTrigger(hour=settings.REMINDER_CHECK_HOUR_UTC, minute=0),
        id="deadline_reminders",
        replace_existing=True,
    )
    scheduler.add_job(
        send_daily_digests,
        trigger=CronTrigger(hour=settings.DIGEST_CHECK_HOUR_UTC, minute=0),
        id="daily_digest",
        replace_existing=True,
    )
    scheduler.start()
    _scheduler = scheduler
    logger.info(
        "APScheduler started \u2014 daily digest at %02d:00 UTC, deadline reminders at %02d:00 UTC",
        settings.DIGEST_CHECK_HOUR_UTC,
        settings.REMINDER_CHECK_HOUR_UTC,
    )
    return scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("APScheduler stopped")


def get_scheduler_status() -> list[dict] | None:
    """Day 37 — connector status monitoring reads this to report whether
    the deadline-reminder/digest jobs are actually running, not just
    whether their settings look configured. Returns None if the
    scheduler was never started (distinct from "started but somehow has
    zero jobs", which get_connector_statuses treats as its own error
    case) — module-private `_scheduler` stays private; this is the one
    sanctioned read of it from outside this module.
    """
    if _scheduler is None:
        return None
    return [
        {
            "id": job.id,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
        }
        for job in _scheduler.get_jobs()
    ]