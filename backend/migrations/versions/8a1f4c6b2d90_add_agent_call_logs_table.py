"""add agent_call_logs table

Revision ID: 8a1f4c6b2d90
Revises: 5c9e2a7f1d34
Create Date: 2026-10-03 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8a1f4c6b2d90"
down_revision: Union[str, Sequence[str], None] = "5c9e2a7f1d34"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_call_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("agent_name", sa.String(length=50), nullable=False),
        sa.Column("intent", sa.String(length=50), nullable=True),
        sa.Column("duration_ms", sa.Float(), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_agent_call_logs_agent_name", "agent_call_logs", ["agent_name"])
    op.create_index("ix_agent_call_logs_created_at", "agent_call_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_agent_call_logs_created_at", table_name="agent_call_logs")
    op.drop_index("ix_agent_call_logs_agent_name", table_name="agent_call_logs")
    op.drop_table("agent_call_logs")
