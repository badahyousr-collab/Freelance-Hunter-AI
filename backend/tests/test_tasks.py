from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.database import Base
from app.models import Project, ProjectMatch, User, UserProfile, UserSource
from app.sources.base import NormalizedProject


def test_scan_enabled_sources_persists_projects_and_creates_user_matches(monkeypatch) -> None:
    from app import tasks

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    class FakeTelegramSource:
        async def discover(self, channels: list[str], limit: int = 50) -> list[NormalizedProject]:
            assert channels == ["@example_jobs"]
            assert limit == 100
            return [
                NormalizedProject(
                    source="telegram",
                    source_project_id="example_jobs:42",
                    url="https://t.me/example_jobs/42",
                    title="Python developer for Telegram bot",
                    description="Need Python and Telegram experience. Budget 500 USD.",
                    language="en",
                    budget_min=500,
                    budget_max=500,
                    currency="USD",
                )
            ]

    monkeypatch.setattr(tasks, "SessionLocal", TestingSession)
    monkeypatch.setattr(tasks, "TelegramChannelSource", FakeTelegramSource)

    with TestingSession() as db:
        user = User(
            email="scan-test@example.com",
            password_hash="not-used-in-this-test",
            is_verified=True,
            is_active=True,
            agent_enabled=True,
        )
        db.add(user)
        db.flush()
        db.add(UserProfile(user_id=user.id, skills=["Python", "Telegram"], languages=["en", "ru"]))
        db.add(UserSource(user_id=user.id, source="telegram", identifier="@example_jobs", is_enabled=True))
        db.commit()
        user_id = user.id

    try:
        result = tasks.scan_enabled_sources.run(user_id=user_id)

        assert result["status"] == "ok"
        assert result["channels"] == 1
        assert result["discovered"] == 1
        assert result["created"] == 1
        assert result["updated"] == 0
        assert result["matched"] == 1

        with TestingSession() as db:
            project = db.scalar(select(Project).where(Project.source_project_id == "example_jobs:42"))
            assert project is not None
            match = db.scalar(select(ProjectMatch).where(ProjectMatch.user_id == user_id))
            assert match is not None
            assert match.project_id == project.id
            assert match.score > 0
            subscription = db.scalar(select(UserSource).where(UserSource.user_id == user_id))
            assert subscription is not None
            assert subscription.last_scan_at is not None
            assert subscription.last_error is None
            assert subscription.last_discovered_count == 1
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
