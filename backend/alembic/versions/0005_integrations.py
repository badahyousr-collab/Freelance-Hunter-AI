"""Add encrypted marketplace integration credentials.

Revision ID: 0005_integrations
Revises: 0004_telegram_link
Create Date: 2026-10-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005_integrations"
down_revision: Union[str, None] = "0004_telegram_link"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_integrations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(40), nullable=False),
        sa.Column("auth_method", sa.String(24), nullable=False),
        sa.Column("encrypted_secret", sa.Text(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "provider", name="uq_user_integration_provider"),
    )
    op.create_index("ix_user_integrations_user_id", "user_integrations", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_integrations_user_id", table_name="user_integrations")
    op.drop_table("user_integrations")
