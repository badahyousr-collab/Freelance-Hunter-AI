"""Add Telegram account linking and per-user agent state.

Revision ID: 0004_telegram_link
Revises: 0003_user_sources
Create Date: 2026-10-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_telegram_link"
down_revision: Union[str, None] = "0003_user_sources"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("agent_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("telegram_user_id", sa.BigInteger(), nullable=True))
    op.create_index("ix_users_telegram_user_id", "users", ["telegram_user_id"], unique=True)
    op.create_table(
        "telegram_link_codes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_telegram_link_codes_user_id", "telegram_link_codes", ["user_id"], unique=False)
    op.create_index("ix_telegram_link_codes_token_hash", "telegram_link_codes", ["token_hash"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_telegram_link_codes_token_hash", table_name="telegram_link_codes")
    op.drop_index("ix_telegram_link_codes_user_id", table_name="telegram_link_codes")
    op.drop_table("telegram_link_codes")
    op.drop_index("ix_users_telegram_user_id", table_name="users")
    op.drop_column("users", "telegram_user_id")
    op.drop_column("users", "agent_enabled")
