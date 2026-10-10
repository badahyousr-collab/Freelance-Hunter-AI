import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import Application, Project, TelegramLinkCode, User
from app.schemas import AgentSettingsResponse, DashboardSummary, TelegramAgentControlRequest, TelegramLinkCodeResponse, TelegramLinkRequest

router = APIRouter(tags=["telegram"])


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def _require_bot_secret(secret: str | None) -> None:
    if settings.app_env.lower() != "development" and settings.bot_api_secret == "development-only-change-me":
        raise HTTPException(status_code=503, detail="Bot API secret is not configured")
    if not secret or not secrets.compare_digest(secret, settings.bot_api_secret):
        raise HTTPException(status_code=401, detail="Invalid bot credentials")


@router.post("/telegram/link-code", response_model=TelegramLinkCodeResponse)
def create_link_code(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> TelegramLinkCodeResponse:
    code = secrets.token_urlsafe(24)
    db.add(TelegramLinkCode(
        user_id=user.id,
        token_hash=_hash_code(code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    ))
    db.commit()
    return TelegramLinkCodeResponse(code=code, expires_in_seconds=600)


@router.post("/telegram/link")
def link_telegram_account(
    payload: TelegramLinkRequest,
    x_bot_secret: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    _require_bot_secret(x_bot_secret)
    link = db.scalar(select(TelegramLinkCode).where(TelegramLinkCode.token_hash == _hash_code(payload.code)))
    now = datetime.now(timezone.utc)
    if link is None or link.used_at is not None:
        raise HTTPException(status_code=400, detail="Link code is invalid or already used")
    expires_at = link.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise HTTPException(status_code=400, detail="Link code has expired")
    user = db.get(User, link.user_id)
    if user is None or not user.is_active or not user.is_verified:
        raise HTTPException(status_code=400, detail="Account is unavailable")
    if user.telegram_user_id is not None and user.telegram_user_id != payload.telegram_user_id:
        raise HTTPException(status_code=409, detail="This account is already linked to another Telegram user")
    other = db.scalar(select(User).where(User.telegram_user_id == payload.telegram_user_id, User.id != user.id))
    if other is not None:
        raise HTTPException(status_code=409, detail="This Telegram account is already linked")
    user.telegram_user_id = payload.telegram_user_id
    link.used_at = now
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This Telegram account is already linked") from None
    return {"message": "Telegram account linked successfully"}


@router.get("/telegram/summary/{telegram_user_id}", response_model=DashboardSummary)
def telegram_summary(
    telegram_user_id: int,
    x_bot_secret: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> DashboardSummary:
    _require_bot_secret(x_bot_secret)
    user = db.scalar(select(User).where(User.telegram_user_id == telegram_user_id))
    if user is None:
        raise HTTPException(status_code=404, detail="Telegram account is not linked; use /link CODE first")
    projects = db.scalar(select(func.count(Project.id))) or 0
    sent = db.scalar(select(func.count(Application.id)).where(Application.user_id == user.id, Application.status.in_(["sent", "replied", "closed"]))) or 0
    replies = db.scalar(select(func.count(Application.id)).where(Application.user_id == user.id, Application.replied_at.is_not(None))) or 0
    from app.models import ProjectMatch
    matched = db.scalar(select(func.count(ProjectMatch.id)).where(ProjectMatch.user_id == user.id)) or 0
    return DashboardSummary(projects_found=projects, matched_projects=matched, proposals_sent=sent, client_replies=replies)


@router.post("/telegram/agent-control")
def telegram_agent_control(
    payload: TelegramAgentControlRequest,
    x_bot_secret: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict[str, str | bool]:
    _require_bot_secret(x_bot_secret)
    user = db.scalar(select(User).where(User.telegram_user_id == payload.telegram_user_id))
    if user is None:
        raise HTTPException(status_code=404, detail="Telegram account is not linked")
    user.agent_enabled = payload.enabled
    db.commit()
    return {"message": "Agent enabled" if user.agent_enabled else "Agent paused", "enabled": user.agent_enabled}


@router.get("/agent/settings", response_model=AgentSettingsResponse)
def get_agent_settings(user: User = Depends(get_current_user)) -> AgentSettingsResponse:
    return AgentSettingsResponse(enabled=user.agent_enabled, telegram_linked=user.telegram_user_id is not None)


@router.patch("/agent/settings", response_model=AgentSettingsResponse)
def update_agent_settings(
    payload: dict[str, bool],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AgentSettingsResponse:
    enabled = payload.get("enabled")
    if not isinstance(enabled, bool):
        raise HTTPException(status_code=422, detail="Field 'enabled' must be a boolean")
    user.agent_enabled = enabled
    db.commit()
    db.refresh(user)
    return AgentSettingsResponse(enabled=user.agent_enabled, telegram_linked=user.telegram_user_id is not None)


@router.delete("/telegram/link", status_code=status.HTTP_204_NO_CONTENT)
def unlink_telegram(response: Response, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    user.telegram_user_id = None
    db.commit()
