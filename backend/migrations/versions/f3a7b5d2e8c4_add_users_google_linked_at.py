"""add users.google_linked_at

Revision ID: f3a7b5d2e8c4
Revises: e2f6a4c9d1b3
Create Date: 2026-10-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a7b5d2e8c4'
down_revision: Union[str, Sequence[str], None] = 'e2f6a4c9d1b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema. Existing rows stay NULL: the first Google sign-in after
    deploying treats the account as not yet verified (see google_sign_in)."""
    op.add_column('users', sa.Column('google_linked_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'google_linked_at')
