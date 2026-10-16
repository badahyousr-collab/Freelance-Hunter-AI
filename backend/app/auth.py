import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserResponse
from app.security import decode_token

router = APIRouter(prefix="/auth", tags=["authentication"])
bearer = HTTPBearer(auto_error=False)
EMAIL_AUTH_DISABLED = "Email authentication is disabled. Use Telegram to access your account."


@router.post("/register", status_code=410)
def register_disabled() -> None:
    raise HTTPException(status_code=410, detail=EMAIL_AUTH_DISABLED)


@router.post("/verify-email", status_code=410)
def verify_email_disabled() -> None:
    raise HTTPException(status_code=410, detail=EMAIL_AUTH_DISABLED)


@router.post("/login", status_code=410)
def login_disabled() -> None:
    raise HTTPException(status_code=410, detail=EMAIL_AUTH_DISABLED)


@router.post("/logout")
def logout(response: Response) -> dict[str, str]:
    response.delete_cookie(key="access_token", path="/", httponly=True, samesite="lax")
    return {"message": "Signed out successfully"}


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    access_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials if credentials is not None else access_token
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        claims = decode_token(token, "access")
        user_id = int(claims["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired access token") from None
    user = db.get(User, user_id)
    if user is None or not user.is_active or not user.is_verified:
        raise HTTPException(status_code=401, detail="User is unavailable")
    return user


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(
        id=user.id,
        auth_method="telegram",
        telegram_user_id=user.telegram_user_id,
        created_at=user.created_at,
    )
