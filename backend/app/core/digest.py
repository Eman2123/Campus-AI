import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.email import send_email
from app.models.schedule import Schedule
from app.models.user import User

logger = logging.getLogger("campus_ai.digest")


def format_digest_email(items: list[Schedule]) -> tuple[str, str]:
    subject = f"Your Campus AI digest \u2014 {len(items)} item(s) coming up"
    lines = ["Here's what's coming up:", ""]
    for item in items:
        kind = "Deadline" if item.source == "deadline" else "Study session"
        lines.append(f"- {item.due_date.strftime('%a %b %-d')}: {item.title} ({kind})")
    lines.append("")
    lines.append("\u2014 Campus AI")
    return subject, "\n".join(lines)


async def send_daily_digests(user_id: str | None = None) -> int:
    """Emails each student a summary of everything due in the next
    DIGEST_LOOKAHEAD_DAYS days (deadlines and study sessions alike) — the
    Email Digest connector from the PRD.

    Unlike Deadline Reminders (Day 20), this isn't gated on an
    "already sent" flag: it's a recurring daily briefing, not a one-time
    nag, so the same upcoming item is expected to reappear in tomorrow's
    digest too. Students with nothing due in the window are skipped
    rather than emailed an empty digest.

    Runs for every student by default — what the APScheduler cron job
    (Day 22) calls once a day. Pass `user_id` to scope it to one student
    instead; that's what `POST /api/schedule/digest-me` uses for an
    on-demand "send me today's digest", and it's also how this gets
    integration-tested without an unscoped trigger.

    Returns the number of digest emails actually sent.
    """
    now = datetime.now(timezone.utc)
    window_end = now + timedelta(days=settings.DIGEST_LOOKAHEAD_DAYS)

    async with AsyncSessionLocal() as db:
        query = (
            select(Schedule, User)
            .join(User, User.id == Schedule.user_id)
            .where(Schedule.due_date > now, Schedule.due_date <= window_end)
            .order_by(Schedule.user_id, Schedule.due_date)
        )
        if user_id is not None:
            query = query.where(Schedule.user_id == user_id)

        result = await db.execute(query)
        rows = result.all()

    items_by_user: dict[str, list[Schedule]] = defaultdict(list)
    users_by_id: dict[str, User] = {}
    for schedule, user in rows:
        key = str(user.id)
        items_by_user[key].append(schedule)
        users_by_id[key] = user

    sent = 0
    for key, items in items_by_user.items():
        user = users_by_id[key]
        subject, body = format_digest_email(items)
        try:
            send_email(to=user.email, subject=subject, body=body)
            sent += 1
        except Exception as exc:
            logger.exception("failed to send digest for user=%s: %s", key, exc)

    logger.info(
        "daily digest job: sent %d digest(s)%s",
        sent,
        f" for user={user_id}" if user_id else "",
    )
    return sent
