import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.agent_call_log import AgentCallLog

logger = logging.getLogger("campus_ai.agent_usage")

# When the graph raises before the Supervisor node even decided which
# specialist to route to (the LLM call itself timing out, say), there's
# no real agent name to attribute the call to. Logging it under this
# label keeps the failure visible in the dashboard instead of silently
# dropping it, without inventing a fake specialist name for something
# no specialist ever touched.
UNROUTED_AGENT_NAME = "supervisor"


async def log_agent_call(agent_name: str, duration_ms: float, success: bool, intent: str | None = None) -> None:
    """Best-effort, fire-and-forget usage log. Same reasoning as
    `_persist_turn` (Day 31): a logging failure must never take down a
    chat reply that already succeeded (or re-raise over a chat reply
    that already failed and is being re-raised for its own reasons) —
    so this owns its own short-lived DB session and only logs on error,
    never raises.
    """
    try:
        async with AsyncSessionLocal() as db:
            db.add(
                AgentCallLog(
                    agent_name=agent_name,
                    intent=intent,
                    duration_ms=duration_ms,
                    success=success,
                )
            )
            await db.commit()
    except Exception as exc:
        logger.exception("failed to log agent call (agent=%s): %s", agent_name, exc)


async def get_agent_usage_summary(db: AsyncSession, since_hours: int = 24) -> list[dict]:
    """Per-agent aggregates for the admin analytics dashboard, scoped to
    the last `since_hours` hours so a long-lived deployment's dashboard
    reflects recent behavior rather than being dominated by month-old
    volume. Average/min/max response time are computed only over
    *successful* calls — a timed-out or errored call's duration isn't a
    meaningful "response time" sample, it's a failure, and mixing the
    two would understate how fast the agent actually responds when it
    works.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=since_hours)

    # Aggregating in Python rather than with SQL GROUP BY/AVG: the row
    # count per agent is small (bounded by actual chat volume, not by
    # document chunks or anything that scales independently), and doing
    # it this way sidesteps dialect differences in how booleans aggregate
    # (tests run against SQLite, prod against Postgres) for one simple
    # query that doesn't need to be clever.
    rows_stmt = select(AgentCallLog).where(AgentCallLog.created_at >= since)
    result = await db.execute(rows_stmt)
    calls = result.scalars().all()

    by_agent: dict[str, dict] = {}
    for call in calls:
        bucket = by_agent.setdefault(
            call.agent_name,
            {
                "agent_name": call.agent_name,
                "total_calls": 0,
                "success_count": 0,
                "failure_count": 0,
                "_durations": [],
                "last_called_at": None,
            },
        )
        bucket["total_calls"] += 1
        if call.success:
            bucket["success_count"] += 1
            bucket["_durations"].append(call.duration_ms)
        else:
            bucket["failure_count"] += 1
        if bucket["last_called_at"] is None or call.created_at > bucket["last_called_at"]:
            bucket["last_called_at"] = call.created_at

    summary = []
    for bucket in by_agent.values():
        durations = bucket.pop("_durations")
        bucket["avg_duration_ms"] = round(sum(durations) / len(durations), 1) if durations else None
        bucket["min_duration_ms"] = round(min(durations), 1) if durations else None
        bucket["max_duration_ms"] = round(max(durations), 1) if durations else None
        summary.append(bucket)

    summary.sort(key=lambda b: b["total_calls"], reverse=True)
    return summary
