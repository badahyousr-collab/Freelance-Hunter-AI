from datetime import datetime, timezone
from types import SimpleNamespace

from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.ingestion import persist_projects
from app.models import Project
from app.sources.base import NormalizedProject
from app.sources.matching import MatchProfile, score_project
from app.sources.telegram_posts import parse_telegram_post


def test_telegram_post_is_normalized_with_budget_and_payment() -> None:
    message = SimpleNamespace(
        id=42,
        text="Нужен Python-разработчик для Telegram-бота\nБюджет: 5000 ₽\nОплата на карту",
        date=datetime(2026, 10, 10, tzinfo=timezone.utc),
    )
    project = parse_telegram_post("@example_jobs", message)
    assert project is not None
    assert project.source == "telegram"
    assert project.source_project_id == "example_jobs:42"
    assert str(project.url) == "https://t.me/example_jobs/42"
    assert project.budget_min == 5000
    assert project.budget_max == 5000
    assert project.currency == "RUB"
    assert project.payment_method == "bank"
    assert project.language == "ru"


def test_telegram_parser_skips_empty_messages() -> None:
    assert parse_telegram_post("@example_jobs", SimpleNamespace(id=1, text="", date=None)) is None
    assert parse_telegram_post("@example_jobs", SimpleNamespace(id=None, text="A freelance project description", date=None)) is None


def test_hard_filters_reject_excluded_keyword() -> None:
    project = parse_telegram_post(
        "@example_jobs",
        SimpleNamespace(id=3, text="Python Telegram bot developer needed. No experience required.", date=None),
    )
    assert project is not None
    result = score_project(project, MatchProfile(skills=("Python", "Telegram"), excluded_keywords=("no experience",)))
    assert result.eligible is False
    assert result.rejected_reason == "Excluded keyword: no experience"


def test_hard_filters_reject_unknown_payment_when_payment_is_required() -> None:
    project = parse_telegram_post(
        "@example_jobs",
        SimpleNamespace(id=4, text="Looking for a Python developer to build an API integration.", date=None),
    )
    assert project is not None
    result = score_project(project, MatchProfile(skills=("Python",), payment_preferences=("crypto",)))
    assert result.eligible is False
    assert result.rejected_reason == "Payment method is unknown"


def test_relevant_project_gets_explainable_score() -> None:
    project = parse_telegram_post(
        "@example_jobs",
        SimpleNamespace(id=5, text="Python developer for Telegram bot, budget 100-200 USD. Crypto payment USDT.", date=None),
    )
    assert project is not None
    result = score_project(project, MatchProfile(skills=("Python", "Telegram bot"), payment_preferences=("crypto",)))
    assert result.eligible is True
    assert 0 <= result.score <= 100
    assert any("Skill match" in reason for reason in result.reasons)


def test_project_ingestion_is_idempotent() -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    project = NormalizedProject(
        source="telegram", source_project_id="channel:12", url="https://t.me/channel/12",
        title="Python bot developer", description="Build a Telegram bot", language="en",
    )
    with Session(engine) as db:
        assert persist_projects(db, [project]) == (1, 0)
        assert persist_projects(db, [project]) == (0, 1)
        assert db.scalar(select(func.count(Project.id))) == 1
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_budget_filter_rejects_unknown_currency() -> None:
    project = NormalizedProject(
        source="telegram", source_project_id="example_jobs:9", url="https://t.me/example_jobs/9",
        title="Python developer needed", description="Build an API", language="en",
        budget_min=100, budget_max=5000, currency=None,
    )
    result = score_project(project, MatchProfile(skills=("Python",), min_budget=100, currency="USD"))
    assert result.eligible is False
    assert result.rejected_reason == "Budget currency is unknown"
