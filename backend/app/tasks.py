from __future__ import annotations

import asyncio
import logging

from celery import Celery
from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.ingestion import persist_projects
from app.models import Project, ProjectMatch, UserProfile, UserSource
from app.sources.matching import MatchProfile, score_project
from app.sources.telegram_client import TelegramChannelSource

logger = logging.getLogger(__name__)
celery_app = Celery("freelance_hunter_ai", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "scan-enabled-telegram-channels": {
            "task": "app.tasks.scan_enabled_sources",
            "schedule": 900.0,
        }
    },
)


@celery_app.task(name="app.tasks.scan_enabled_sources", bind=True, max_retries=2)
def scan_enabled_sources(self) -> dict[str, int | str]:
    """Scan configured Telegram channels, deduplicate listings, and refresh user matches."""
    with SessionLocal() as db:
        subscriptions = db.scalars(
            select(UserSource).join(User, User.id == UserSource.user_id).where(UserSource.source == "telegram", UserSource.is_enabled.is_(True), User.agent_enabled.is_(True))
        ).all()
        channels = sorted({"@" + row.identifier.lstrip("@") for row in subscriptions if row.identifier})
        if not channels:
            return {"status": "skipped", "reason": "no_enabled_telegram_channels", "created": 0, "updated": 0}
        try:
            projects = asyncio.run(TelegramChannelSource().discover(channels=channels, limit=100))
        except Exception as exc:
            logger.exception("Telegram source scan failed")
            raise self.retry(exc=exc, countdown=30 * (self.request.retries + 1)) from exc

        created, updated = persist_projects(db, projects)
        subscription_by_channel: dict[str, set[int]] = {}
        for row in subscriptions:
            channel = row.identifier.lstrip("@").casefold()
            subscription_by_channel.setdefault(channel, set()).add(row.user_id)

        matched = 0
        for normalized in projects:
            project = db.scalar(
                select(Project).where(
                    Project.source == normalized.source,
                    Project.source_project_id == normalized.source_project_id,
                )
            )
            if project is None:
                continue
            channel = normalized.source_project_id.rsplit(":", 1)[0].casefold()
            for user_id in subscription_by_channel.get(channel, set()):
                profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
                if profile is None:
                    continue
                result = score_project(
                    normalized,
                    MatchProfile(
                        skills=tuple(profile.skills or []),
                        languages=tuple(profile.languages or []),
                        min_budget=profile.min_budget,
                        currency=profile.currency,
                        payment_preferences=tuple(profile.payment_preferences or []),
                        excluded_keywords=tuple(profile.excluded_keywords or []),
                    ),
                )
                existing = db.scalar(
                    select(ProjectMatch).where(ProjectMatch.user_id == user_id, ProjectMatch.project_id == project.id)
                )
                if not result.eligible:
                    if existing is not None:
                        db.delete(existing)
                    continue
                if existing is None:
                    existing = ProjectMatch(user_id=user_id, project_id=project.id, score=result.score, reasons=list(result.reasons))
                    db.add(existing)
                else:
                    existing.score = result.score
                    existing.reasons = list(result.reasons)
                matched += 1
        db.commit()
        return {"status": "ok", "channels": len(channels), "discovered": len(projects), "created": created, "updated": updated, "matched": matched}
