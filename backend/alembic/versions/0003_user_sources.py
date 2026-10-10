"""Add user-configured discovery sources.

Revision ID: 0003_user_sources
Revises: 0002_workspace
Create Date: 2026-10-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_user_sources"
down_revision: Union[str, None] = "0002_workspace"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_sources",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source", sa.String(40), nullable=False),
        sa.Column("identifier", sa.String(255), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("status", sa.String(24), nullable=False, server_default="configured"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "source", "identifier", name="uq_user_source_identifier"),
    )
    op.create_index("ix_user_sources_user_id", "user_sources", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_sources_user_id", table_name="user_sources")
    op.drop_table("user_sources")
