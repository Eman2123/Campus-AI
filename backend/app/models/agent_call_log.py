import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AgentCallLog(Base):
    """Day 36 — one row per completed graph invocation, written from the
    single choke point every chat/voice request already passes through
    (`_run_graph` in app/api/routes/agent.py). Deliberately append-only
    and disconnected from `messages`/`sessions` by foreign key: usage
    analytics should keep working even if a chat message itself failed
    to persist (best-effort, same as chat_history), and a failed graph
    run (success=False) never produced a message row to join against
    anyway — the whole point is to also capture failures.
    """

    __tablename__ = "agent_call_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # "supervisor" when the graph raised before routing decided a
    # specialist node (e.g. the LLM call itself failed) — see the
    # comment in log_agent_call() for why that fallback name matters.
    agent_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    intent: Mapped[str | None] = mapped_column(String(50), nullable=True)
    duration_ms: Mapped[float] = mapped_column(Float, nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
