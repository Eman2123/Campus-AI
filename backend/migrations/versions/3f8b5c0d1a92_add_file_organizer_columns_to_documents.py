"""add file organizer columns to documents

Revision ID: 3f8b5c0d1a92
Revises: 9d2f6a1e8c47
Create Date: 2026-09-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f8b5c0d1a92'
down_revision: Union[str, Sequence[str], None] = '9d2f6a1e8c47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('documents', sa.Column('subject', sa.String(length=100), nullable=True))
    op.add_column('documents', sa.Column('drive_file_id', sa.String(length=255), nullable=True))
    op.add_column('documents', sa.Column('drive_folder_path', sa.String(length=500), nullable=True))
    op.add_column('documents', sa.Column('organize_status', sa.String(length=20), nullable=False, server_default='pending'))
    op.alter_column('documents', 'organize_status', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('documents', 'organize_status')
    op.drop_column('documents', 'drive_folder_path')
    op.drop_column('documents', 'drive_file_id')
    op.drop_column('documents', 'subject')
