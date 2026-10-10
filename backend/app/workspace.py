from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Application, Project, ProjectMatch, User, UserProfile, UserSource
from app.project_scope import project_scope_conditions
from app.schemas import (
    ApplicationCreate,
    ApplicationResponse,
    DashboardSummary,
    ProfileResponse,
    ProfileUpdate,
    ProjectResponse,
    SourceCatalogItem,
    SourceCreate,
    SourceResponse,
    SourceUpdate,
)

router = APIRouter(tags=["workspace"])


@router.get("/profile", response_model=ProfileResponse)
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ProfileResponse:
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
    if profile is None:
        return ProfileResponse()
    return ProfileResponse.model_validate(profile, from_attributes=True)


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    data = payload.model_dump()
    data["skills"] = list(dict.fromkeys(s.strip() for s in data["skills"] if s.strip()))
    data["languages"] = list(dict.fromkeys(s.strip().lower() for s in data["languages"] if s.strip()))
    data["payment_preferences"] = list(dict.fromkeys(s.strip().lower() for s in data["payment_preferences"] if s.strip()))
    data["excluded_keywords"] = list(dict.fromkeys(s.strip().lower() for s in data["excluded_keywords"] if s.strip()))
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
    if profile is None:
        profile = UserProfile(user_id=user.id, **data)
        db.add(profile)
    else:
        for key, value in data.items():
            setattr(profile, key, value)
        profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)
    return ProfileResponse.model_validate(profile, from_attributes=True)


@router.get("/projects", response_model=list[ProjectResponse])
def list_projects(
    q: str | None = Query(default=None, min_length=1, max_length=200),
    source: str | None = Query(default=None, max_length=80),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProjectResponse]:
    statement = select(Project).where(project_scope_conditions(db, user)).order_by(Project.discovered_at.desc()).limit(limit).offset(offset)
    if source:
        statement = statement.where(Project.source == source)
    if q:
        pattern = f"%{q.strip()}%"
        statement = statement.where(or_(Project.title.ilike(pattern), Project.description.ilike(pattern)))
    projects = db.scalars(statement).all()
    matches = db.scalars(select(ProjectMatch).where(ProjectMatch.user_id == user.id)).all()
    by_project = {match.project_id: match for match in matches}
    return [
        ProjectResponse.model_validate(project, from_attributes=True).model_copy(
            update={
                "match_score": by_project[project.id].score if project.id in by_project else None,
                "match_reasons": by_project[project.id].reasons if project.id in by_project else [],
            }
        )
        for project in projects
    ]


@router.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> DashboardSummary:
    projects_found = db.scalar(select(func.count(Project.id)).where(project_scope_conditions(db, user))) or 0
    matched = db.scalar(select(func.count(ProjectMatch.id)).where(ProjectMatch.user_id == user.id)) or 0
    sent = db.scalar(
        select(func.count(Application.id)).where(
            Application.user_id == user.id,
            Application.status.in_(["sent", "replied", "closed"]),
        )
    ) or 0
    replies = db.scalar(
        select(func.count(Application.id)).where(
            Application.user_id == user.id,
            Application.replied_at.is_not(None),
        )
    ) or 0
    return DashboardSummary(
        projects_found=projects_found,
        matched_projects=matched,
        proposals_sent=sent,
        client_replies=replies,
    )


@router.get("/applications", response_model=list[ApplicationResponse])
def list_applications(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[ApplicationResponse]:
    rows = db.execute(
        select(Application, Project)
        .join(Project, Project.id == Application.project_id)
        .where(Application.user_id == user.id)
        .order_by(Application.created_at.desc())
        .limit(100)
    ).all()
    return [
        ApplicationResponse(
            id=application.id,
            project_id=application.project_id,
            status=application.status,
            draft_text=application.draft_text,
            created_at=application.created_at,
            submitted_at=application.submitted_at,
            replied_at=application.replied_at,
            project=ProjectResponse.model_validate(project, from_attributes=True),
        )
        for application, project in rows
    ]


@router.post("/applications", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application_draft(
    payload: ApplicationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    project = db.get(Project, payload.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    existing = db.scalar(
        select(Application).where(
            Application.user_id == user.id,
            Application.project_id == payload.project_id,
            Application.status.not_in(["failed", "closed"]),
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="An active application already exists for this project")
    application = Application(user_id=user.id, project_id=project.id, draft_text=payload.draft_text, status="draft")
    db.add(application)
    db.commit()
    db.refresh(application)
    return ApplicationResponse(
        id=application.id,
        project_id=application.project_id,
        status=application.status,
        draft_text=application.draft_text,
        created_at=application.created_at,
        submitted_at=application.submitted_at,
        replied_at=application.replied_at,
        project=ProjectResponse.model_validate(project, from_attributes=True),
    )


_SOURCE_CATALOG = [
    SourceCatalogItem(source="telegram", label="Telegram channels", kind="telegram", capabilities=["discovery"], setup_note="Add a public channel username, for example @python_jobs. Telegram API session setup is required on the server."),
    SourceCatalogItem(source="kwork", label="Kwork", kind="marketplace", capabilities=["discovery"], setup_note="Discovery adapter is not connected yet; source setup does not imply a working integration."),
    SourceCatalogItem(source="fl_ru", label="FL.ru", kind="marketplace", capabilities=["discovery"], setup_note="Discovery adapter is not connected yet; source setup does not imply a working integration."),
    SourceCatalogItem(source="freelancer", label="Freelancer.com", kind="marketplace", capabilities=["discovery"], setup_note="Discovery adapter is not connected yet; source setup does not imply a working integration."),
    SourceCatalogItem(source="upwork", label="Upwork", kind="marketplace", capabilities=["discovery"], setup_note="Discovery adapter is not connected yet; source setup does not imply a working integration."),
]


@router.get("/sources/catalog", response_model=list[SourceCatalogItem])
def source_catalog(user: User = Depends(get_current_user)) -> list[SourceCatalogItem]:
    return _SOURCE_CATALOG


@router.get("/sources", response_model=list[SourceResponse])
def list_sources(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[SourceResponse]:
    rows = db.scalars(
        select(UserSource).where(UserSource.user_id == user.id).order_by(UserSource.created_at.desc())
    ).all()
    return [SourceResponse.model_validate(row, from_attributes=True) for row in rows]


@router.post("/sources", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
def create_source(
    payload: SourceCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SourceResponse:
    source = payload.source
    identifier = (payload.identifier or "").strip()
    if source == "telegram":
        identifier = identifier.lstrip("@")
        if not identifier:
            raise HTTPException(status_code=422, detail="A public Telegram channel username is required")
        if not all(ch.isalnum() or ch == "_" for ch in identifier):
            raise HTTPException(status_code=422, detail="Telegram channel username may contain letters, digits, and underscores")
    else:
        identifier = identifier or source
    existing = db.scalar(
        select(UserSource).where(
            UserSource.user_id == user.id,
            UserSource.source == source,
            UserSource.identifier == identifier,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="This source is already configured")
    row = UserSource(
        user_id=user.id,
        source=source,
        identifier=identifier,
        is_enabled=payload.is_enabled,
        status="configured" if source == "telegram" else "pending_integration",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return SourceResponse.model_validate(row, from_attributes=True)


@router.patch("/sources/{source_id}", response_model=SourceResponse)
def update_source(
    source_id: int,
    payload: SourceUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SourceResponse:
    row = db.scalar(select(UserSource).where(UserSource.id == source_id, UserSource.user_id == user.id))
    if row is None:
        raise HTTPException(status_code=404, detail="Source configuration not found")
    row.is_enabled = payload.is_enabled
    db.commit()
    db.refresh(row)
    return SourceResponse.model_validate(row, from_attributes=True)


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(
    source_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    row = db.scalar(select(UserSource).where(UserSource.id == source_id, UserSource.user_id == user.id))
    if row is None:
        raise HTTPException(status_code=404, detail="Source configuration not found")
    db.delete(row)
    db.commit()
