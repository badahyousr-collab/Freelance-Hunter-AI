"""Add an optional public portfolio link to the freelancer profile."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008_profile_portfolio_url"
down_revision: Union[str, None] = "0007_telegram_only_identity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_profiles", sa.Column("portfolio_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("user_profiles", "portfolio_url")
