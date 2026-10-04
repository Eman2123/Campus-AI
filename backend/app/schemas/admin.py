import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class AdminUserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AgentUsageOut(BaseModel):
    """Day 36 — one row of the analytics table per agent name (including
    the `supervisor` fallback bucket for calls that failed before
    routing). avg/min/max_duration_ms are `None` for an agent with zero
    successful calls in the window — all its calls failed, so there's
    no real response-time sample to report, not a 0ms one."""

    agent_name: str
    total_calls: int
    success_count: int
    failure_count: int
    avg_duration_ms: float | None
    min_duration_ms: float | None
    max_duration_ms: float | None
    last_called_at: datetime | None


class AgentUsageSummaryOut(BaseModel):
    since_hours: int
    by_agent: list[AgentUsageOut]


class ConnectorStatusOut(BaseModel):
    """Day 37 — one row per connector on the admin status page."""

    name: str
    label: str
    status: str  # "healthy" | "configured" | "stub" | "error"
    detail: str