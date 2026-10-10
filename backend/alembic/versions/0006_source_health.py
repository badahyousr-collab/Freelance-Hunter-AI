"""Track per-source ingestion health.

Revision ID: 0006_source_health
Revises: 0005_integrations
Create Date: 2026-10-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006_source_health"
down_revision: Union[str, None] = "0005_integrations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_sources", sa.Column("last_scan_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("user_sources", sa.Column("last_error", sa.Text(), nullable=True))
    op.add_column("user_sources", sa.Column("last_discovered_count", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("user_sources", "last_discovered_count")
    op.drop_column("user_sources", "last_error")
    op.drop_column("user_sources", "last_scan_at")
