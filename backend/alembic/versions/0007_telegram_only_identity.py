"""Replace email/password fields with Telegram identity.

Revision ID: 0007_telegram_only_identity
Revises: 0006_source_health
Create Date: 2026-10-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007_telegram_only_identity"
down_revision: Union[str, None] = "0006_source_health"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("identity_provider", sa.String(length=24), nullable=False, server_default="telegram"))
    op.add_column("users", sa.Column("telegram_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute(
        "UPDATE users SET identity_provider = CASE WHEN telegram_user_id IS NOT NULL THEN 'telegram' ELSE 'legacy' END"
    )
    op.execute(
        "UPDATE users SET telegram_verified = CASE WHEN telegram_user_id IS NOT NULL THEN TRUE ELSE FALSE END"
    )
    op.drop_index("ix_users_email", table_name="users")
    op.drop_column("users", "email")
    op.drop_column("users", "password_hash")
    op.drop_column("users", "is_verified")


def downgrade() -> None:
    # Downgrade restores the old columns as nullable placeholders. Removed email
    # addresses and password hashes cannot be reconstructed.
    op.add_column("users", sa.Column("email", sa.String(length=320), nullable=True))
    op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.drop_column("users", "telegram_verified")
    op.drop_column("users", "identity_provider")
