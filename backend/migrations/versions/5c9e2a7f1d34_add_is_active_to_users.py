"""add is_active to users

Revision ID: 5c9e2a7f1d34
Revises: 3f8b5c0d1a92
Create Date: 2026-09-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c9e2a7f1d34'
down_revision: Union[str, Sequence[str], None] = '3f8b5c0d1a92'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.alter_column('users', 'is_active', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'is_active')
