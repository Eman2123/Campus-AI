"""add users.token_version

Revision ID: d1a5f3b8c7e2
Revises: c4d8e1f7a2b6
Create Date: 2026-10-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1a5f3b8c7e2'
down_revision: Union[str, Sequence[str], None] = 'c4d8e1f7a2b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema. Existing users start at 0, which is also what a token
    without the "tv" claim is treated as, so nobody is signed out."""
    op.add_column('users', sa.Column('token_version', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'token_version')
