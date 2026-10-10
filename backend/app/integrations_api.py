from datetime import datetime, timezone

from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import User, UserIntegration
from app.schemas import IntegrationCatalogItem, IntegrationCreate, IntegrationResponse

router = APIRouter(tags=["integrations"])

_CATALOG = [
    IntegrationCatalogItem(provider="upwork", label="Upwork", status="adapter_pending", setup_note="Only use official API access granted to your account. OAuth/API adapter and submission capability are not yet verified."),
    IntegrationCatalogItem(provider="freelancer", label="Freelancer.com", status="adapter_pending", setup_note="OAuth/API adapter and submission capability are not yet verified."),
    IntegrationCatalogItem(provider="kwork", label="Kwork", status="adapter_pending", setup_note="Account integration is not yet implemented. Do not submit passwords or browser cookies here."),
    IntegrationCatalogItem(provider="fl_ru", label="FL.ru", status="adapter_pending", setup_note="Account integration is not yet implemented. Do not submit passwords or browser cookies here."),
]


def _fernet() -> Fernet:
    if not settings.integration_encryption_key:
        raise HTTPException(status_code=503, detail="Integration encryption key is not configured on the server")
    try:
        return Fernet(settings.integration_encryption_key.encode("utf-8"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=503, detail="Integration encryption key is invalid") from None


@router.get("/integrations/catalog", response_model=list[IntegrationCatalogItem])
def integration_catalog(user: User = Depends(get_current_user)) -> list[IntegrationCatalogItem]:
    return _CATALOG


@router.get("/integrations", response_model=list[IntegrationResponse])
def list_integrations(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[IntegrationResponse]:
    rows = db.scalars(
        select(UserIntegration).where(UserIntegration.user_id == user.id).order_by(UserIntegration.created_at.desc())
    ).all()
    return [IntegrationResponse.model_validate(row, from_attributes=True) for row in rows]


@router.post("/integrations", response_model=IntegrationResponse, status_code=status.HTTP_201_CREATED)
def save_integration(
    payload: IntegrationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IntegrationResponse:
    cipher = _fernet()
    existing = db.scalar(
        select(UserIntegration).where(
            UserIntegration.user_id == user.id,
            UserIntegration.provider == payload.provider,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="An integration record already exists. Remove it before replacing the credential.")
    encrypted = cipher.encrypt(payload.secret.encode("utf-8")).decode("ascii")
    row = UserIntegration(
        user_id=user.id,
        provider=payload.provider,
        auth_method="api_token",
        encrypted_secret=encrypted,
        status="credential_saved_unverified",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return IntegrationResponse.model_validate(row, from_attributes=True)


@router.delete("/integrations/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_integration(
    integration_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    row = db.scalar(
        select(UserIntegration).where(UserIntegration.id == integration_id, UserIntegration.user_id == user.id)
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Integration not found")
    db.delete(row)
    db.commit()
