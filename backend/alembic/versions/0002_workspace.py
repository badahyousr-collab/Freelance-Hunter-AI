"""Create user profiles, projects, matches, and applications.

Revision ID: 0002_workspace
Revises: 0001_create_users
Create Date: 2026-10-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_workspace"
down_revision: Union[str, None] = "0001_create_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("display_name", sa.String(100), nullable=True),
        sa.Column("skills", sa.JSON(), nullable=False),
        sa.Column("languages", sa.JSON(), nullable=False),
        sa.Column("min_budget", sa.Float(), nullable=True),
        sa.Column("currency", sa.String(8), nullable=False),
        sa.Column("payment_preferences", sa.JSON(), nullable=False),
        sa.Column("excluded_keywords", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_user_profiles_user_id", "user_profiles", ["user_id"], unique=True)
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(80), nullable=False),
        sa.Column("source_project_id", sa.String(255), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False, unique=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("language", sa.String(8), nullable=True),
        sa.Column("budget_min", sa.Float(), nullable=True),
        sa.Column("budget_max", sa.Float(), nullable=True),
        sa.Column("currency", sa.String(8), nullable=True),
        sa.Column("payment_method", sa.String(80), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("discovered_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("source", "source_project_id", name="uq_project_source_external_id"),
    )
    op.create_index("ix_projects_id", "projects", ["id"], unique=False)
    op.create_index("ix_projects_source", "projects", ["source"], unique=False)
    op.create_index("ix_projects_discovered_at", "projects", ["discovered_at"], unique=False)
    op.create_table(
        "project_matches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("reasons", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "project_id", name="uq_user_project_match"),
    )
    op.create_index("ix_project_matches_user_id", "project_matches", ["user_id"], unique=False)
    op.create_index("ix_project_matches_project_id", "project_matches", ["project_id"], unique=False)
    op.create_table(
        "applications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("draft_text", sa.Text(), nullable=True),
        sa.Column("source_submission_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replied_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_applications_user_id", "applications", ["user_id"], unique=False)
    op.create_index("ix_applications_project_id", "applications", ["project_id"], unique=False)
    op.create_index("ix_applications_status", "applications", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_applications_status", table_name="applications")
    op.drop_index("ix_applications_project_id", table_name="applications")
    op.drop_index("ix_applications_user_id", table_name="applications")
    op.drop_table("applications")
    op.drop_index("ix_project_matches_project_id", table_name="project_matches")
    op.drop_index("ix_project_matches_user_id", table_name="project_matches")
    op.drop_table("project_matches")
    op.drop_index("ix_projects_discovered_at", table_name="projects")
    op.drop_index("ix_projects_source", table_name="projects")
    op.drop_index("ix_projects_id", table_name="projects")
    op.drop_table("projects")
    op.drop_index("ix_user_profiles_user_id", table_name="user_profiles")
    op.drop_table("user_profiles")
