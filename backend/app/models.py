from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    identity_provider: Mapped[str] = mapped_column(String(24), default="telegram", nullable=False)
    telegram_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    agent_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    telegram_user_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, index=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    portfolio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    languages: Mapped[list] = mapped_column(JSON, default=lambda: ["ru", "en"], nullable=False)
    min_budget: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)
    payment_preferences: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    excluded_keywords: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("source", "source_project_id", name="uq_project_source_external_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    source_project_id: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    language: Mapped[str | None] = mapped_column(String(8), nullable=True)
    budget_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    budget_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str | None] = mapped_column(String(8), nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(80), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True, nullable=False)


class ProjectMatch(Base):
    __tablename__ = "project_matches"
    __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_user_project_match"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    reasons: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="draft", index=True, nullable=False)
    draft_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_submission_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    replied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class UserSource(Base):
    __tablename__ = "user_sources"
    __table_args__ = (UniqueConstraint("user_id", "source", "identifier", name="uq_user_source_identifier"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(40), nullable=False)
    identifier: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="configured", nullable=False)
    last_scan_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_discovered_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class TelegramLinkCode(Base):
    __tablename__ = "telegram_link_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class UserIntegration(Base):
    __tablename__ = "user_integrations"
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_user_integration_provider"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    auth_method: Mapped[str] = mapped_column(String(24), default="api_token", nullable=False)
    encrypted_secret: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="credential_saved_unverified", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
