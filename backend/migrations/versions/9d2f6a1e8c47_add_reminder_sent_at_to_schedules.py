"""add reminder_sent_at to schedules

Revision ID: 9d2f6a1e8c47
Revises: 7a1c4e9f2b3d
Create Date: 2026-09-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d2f6a1e8c47'
down_revision: Union[str, Sequence[str], None] = '7a1c4e9f2b3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('schedules', sa.Column('reminder_sent_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('schedules', 'reminder_sent_at')
