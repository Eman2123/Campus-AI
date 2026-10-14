"""add users.terms_accepted_at and terms_version

Revision ID: a8c2e6f1b3d9
Revises: f3a7b5d2e8c4
Create Date: 2026-10-14 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'a8c2e6f1b3d9'
down_revision: Union[str, Sequence[str], None] = 'f3a7b5d2e8c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('terms_accepted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('terms_version', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'terms_version')
    op.drop_column('users', 'terms_accepted_at')
