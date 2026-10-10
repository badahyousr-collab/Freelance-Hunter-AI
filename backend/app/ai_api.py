from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai_service import generate_proposal
from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import Application, Project, User, UserProfile
from app.schemas import ApplicationResponse, ProjectResponse

router = APIRouter(tags=["AI proposals"])


@router.post("/applications/{project_id}/draft", response_model=ApplicationResponse)
async def create_ai_draft(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
    if profile is None or not profile.skills:
        raise HTTPException(status_code=400, detail="Add your skills in Settings before generating a proposal")
    if not (settings.llm_base_url and settings.llm_api_key and settings.llm_model):
        raise HTTPException(status_code=503, detail="AI provider is not configured on the server")

    application = db.scalar(
        select(Application).where(
            Application.user_id == user.id,
            Application.project_id == project.id,
            Application.status.not_in(["failed", "closed"]),
        )
    )
    if application is not None and application.status != "draft":
        raise HTTPException(status_code=409, detail="A proposal already exists and is no longer an editable draft")
    try:
        draft = await generate_proposal(project, profile)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if application is None:
        application = Application(user_id=user.id, project_id=project.id, status="draft", draft_text=draft)
        db.add(application)
    else:
        application.draft_text = draft
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
