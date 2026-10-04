import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.email import send_email
from app.models.schedule import Schedule
from app.models.user import User

logger = logging.getLogger("campus_ai.reminders")


def format_reminder_email(title: str, due_date: datetime) -> tuple[str, str]:
    subject = f"Reminder: {title} is due soon"
    body = (
        f"Hi,\n\nJust a heads up \u2014 \"{title}\" is due "
        f"{due_date.strftime('%A, %B %-d, %Y')}.\n\n\u2014 Campus AI"
    )
    return subject, body


async def send_deadline_reminders(user_id: str | None = None) -> int:
    """Emails a reminder for every not-yet-reminded "deadline" schedule row
    (never for individual study sessions) whose due date falls within the
    reminder window from now.

    Runs for every student by default — this is what the APScheduler cron
    job (Day 20) calls once a day. Pass `user_id` to scope it to one
    student instead; that's what `POST /api/schedule/remind-me` uses for a
    self-serve "remind me now", and it's also the only realistic way to
    integration-test this end-to-end without an unscoped trigger.

    Returns the number of reminders actually sent.
    """
    now = datetime.now(timezone.utc)
    window_end = now + timedelta(hours=settings.REMINDER_LEAD_TIME_HOURS)

    sent = 0
    async with AsyncSessionLocal() as db:
        query = (
            select(Schedule, User)
            .join(User, User.id == Schedule.user_id)
            .where(
                Schedule.source == "deadline",
                Schedule.reminder_sent_at.is_(None),
                Schedule.due_date > now,
                Schedule.due_date <= window_end,
            )
        )
        if user_id is not None:
            query = query.where(Schedule.user_id == user_id)

        result = await db.execute(query)
        rows = result.all()

        for schedule, user in rows:
            subject, body = format_reminder_email(schedule.title, schedule.due_date)
            try:
                send_email(to=user.email, subject=subject, body=body)
            except Exception as exc:
                logger.exception("failed to send reminder for schedule=%s: %s", schedule.id, exc)
                continue
            schedule.reminder_sent_at = now
            sent += 1

        await db.commit()

    logger.info(
        "deadline reminder job: sent %d reminder(s)%s",
        sent,
        f" for user={user_id}" if user_id else "",
    )
    return sent
