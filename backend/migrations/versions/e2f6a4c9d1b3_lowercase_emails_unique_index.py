"""lowercase user emails and enforce case-insensitive uniqueness

Revision ID: e2f6a4c9d1b3
Revises: d1a5f3b8c7e2
Create Date: 2026-10-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2f6a4c9d1b3'
down_revision: Union[str, Sequence[str], None] = 'd1a5f3b8c7e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _assert_no_case_duplicates(connection) -> None:
    """Two accounts that differ only by case can't be merged automatically
    (which one owns the chats and documents?), so stop and say who they are."""
    rows = connection.execute(
        sa.text(
            "SELECT lower(email) AS email, array_agg(email ORDER BY created_at) AS variants "
            "FROM users GROUP BY lower(email) HAVING count(*) > 1"
        )
    ).fetchall()
    if rows:
        listing = "; ".join(f"{row[0]} ({', '.join(row[1])})" for row in rows)
        raise RuntimeError(
            "Cannot lowercase emails: these addresses exist more than once with different "
            f"capitalisation: {listing}. Merge or delete the duplicate accounts, then run the "
            "migration again."
        )


def upgrade() -> None:
    """Upgrade schema."""
    connection = op.get_bind()
    _assert_no_case_duplicates(connection)
    op.execute("UPDATE users SET email = lower(email) WHERE email <> lower(email)")
    op.execute("CREATE UNIQUE INDEX ix_users_email_lower ON users (lower(email))")


def downgrade() -> None:
    """Downgrade schema. The original capitalisation is not recoverable."""
    op.execute("DROP INDEX IF EXISTS ix_users_email_lower")
