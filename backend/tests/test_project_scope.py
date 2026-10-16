from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Project, User, UserSource
from app.project_scope import project_scope_conditions


def test_project_scope_includes_only_enabled_channels_for_user() -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        first = User(identity_provider="telegram", telegram_verified=True, telegram_user_id=1001)
        second = User(identity_provider="telegram", telegram_verified=True, telegram_user_id=1002)
        db.add_all([first, second])
        db.flush()
        db.add_all([
            UserSource(user_id=first.id, source="telegram", identifier="python_jobs", is_enabled=True, status="configured"),
            UserSource(user_id=first.id, source="telegram", identifier="paused_jobs", is_enabled=False, status="configured"),
            UserSource(user_id=second.id, source="telegram", identifier="other_jobs", is_enabled=True, status="configured"),
        ])
        db.add_all([
            Project(source="telegram", source_project_id="python_jobs:1", url="https://t.me/python_jobs/1", title="A", description=""),
            Project(source="telegram", source_project_id="paused_jobs:2", url="https://t.me/paused_jobs/2", title="B", description=""),
            Project(source="telegram", source_project_id="other_jobs:3", url="https://t.me/other_jobs/3", title="C", description=""),
        ])
        db.commit()
        first_count = db.scalar(select(func.count(Project.id)).where(project_scope_conditions(db, first)))
        second_count = db.scalar(select(func.count(Project.id)).where(project_scope_conditions(db, second)))
        assert first_count == 1
        assert second_count == 1
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
