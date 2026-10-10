from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Project
from app.sources.base import NormalizedProject


def persist_projects(db: Session, projects: list[NormalizedProject]) -> tuple[int, int]:
    """Persist normalized projects idempotently; return (created, updated)."""
    created = updated = 0
    for item in projects:
        url = str(item.url)
        record = db.scalar(
            select(Project).where(
                (Project.source == item.source) & (Project.source_project_id == item.source_project_id)
            )
        )
        if record is None:
            record = db.scalar(select(Project).where(Project.url == url))
        values = {
            "source": item.source,
            "source_project_id": item.source_project_id,
            "url": url,
            "title": item.title,
            "description": item.description,
            "language": item.language,
            "budget_min": item.budget_min,
            "budget_max": item.budget_max,
            "currency": item.currency,
            "payment_method": item.payment_method,
            "published_at": item.published_at,
        }
        if record is None:
            db.add(Project(**values))
            created += 1
        else:
            for key, value in values.items():
                setattr(record, key, value)
            updated += 1
    db.commit()
    return created, updated
