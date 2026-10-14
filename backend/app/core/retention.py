"""Retention: delete data we promised not to keep forever.

* Anonymous usage statistics (agent_call_logs): LOG_RETENTION_DAYS (90).
* Password-reset links: once expired they are useless, so they go.

Runs daily from the scheduler (see scheduler.py). The privacy policy's
"How long we keep your data" section describes exactly this.
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.agent_call_log import AgentCallLog
from app.models.password_reset_token import PasswordResetToken

logger = logging.getLogger("campus_ai.retention")


async def purge_expired_data() -> dict[str, int]:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=settings.LOG_RETENTION_DAYS)
    async with AsyncSessionLocal() as db:
        logs = await db.execute(delete(AgentCallLog).where(AgentCallLog.created_at < cutoff))
        tokens = await db.execute(delete(PasswordResetToken).where(PasswordResetToken.expires_at < now))
        await db.commit()
    result = {"agent_call_logs": logs.rowcount or 0, "password_reset_tokens": tokens.rowcount or 0}
    logger.info("retention purge removed %s", result)
    return result
