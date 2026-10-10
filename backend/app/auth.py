import smtplib
from email.message import EmailMessage

import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, RegisterResponse, UserResponse, VerifyEmailRequest
from app.security import create_token, decode_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["authentication"])
bearer = HTTPBearer(auto_error=False)


def _send_verification_email(email: str, token: str) -> None:
    if not (settings.smtp_host and settings.email_from):
        raise RuntimeError("Email delivery is not configured")
    message = EmailMessage()
    message["Subject"] = "Verify your Freelance Hunter AI email"
    message["From"] = settings.email_from
    message["To"] = email
    message.set_content(
        "Verify your email by opening this link:\n"
        f"{settings.web_origin}/verify-email?token={token}\n\n"
        "If you did not create this account, ignore this message."
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        server.starttls()
        if settings.smtp_username:
            server.login(settings.smtp_username, settings.smtp_password or "")
        server.send_message(message)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    email = str(payload.email).strip().lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    if settings.app_env.lower() != "development" and not (settings.smtp_host and settings.email_from):
        raise HTTPException(status_code=503, detail="Email verification is not configured")

    user = User(email=email, password_hash=hash_password(payload.password), is_verified=False)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token(str(user.id), "email_verification", settings.verification_token_minutes)

    try:
        _send_verification_email(email, token)
        return RegisterResponse(message="Account created. Check your email to verify it.")
    except (RuntimeError, OSError, smtplib.SMTPException):
        if settings.app_env.lower() == "development":
            return RegisterResponse(
                message="Account created. Use the development token to verify your email.",
                verification_token=token,
            )
        db.delete(user)
        db.commit()
        raise HTTPException(status_code=503, detail="Could not send verification email") from None


@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        claims = decode_token(payload.token, "email_verification")
        user_id = int(claims["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Verification token is invalid or expired") from None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=400, detail="Account not found")
    if user.is_verified:
        return {"message": "Email already verified"}
    user.is_verified = True
    db.commit()
    return {"message": "Email verified successfully"}


@router.post("/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> dict[str, str]:
    email = str(payload.email).strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Verify your email before signing in")
    token = create_token(str(user.id), "access", settings.access_token_minutes)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.app_env.lower() not in {"development", "test"},
        samesite="lax",
        max_age=settings.access_token_minutes * 60,
        path="/",
    )
    return {"message": "Signed in successfully"}


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
    return UserResponse(id=user.id, email=user.email, is_verified=user.is_verified, created_at=user.created_at)
