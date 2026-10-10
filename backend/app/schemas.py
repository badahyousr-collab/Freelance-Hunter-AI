from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=20, max_length=2048)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    is_verified: bool
    created_at: datetime


class RegisterResponse(BaseModel):
    message: str
    # Only populated in development when no SMTP provider is configured.
    verification_token: str | None = None


class SourceCreate(BaseModel):
    source: str = Field(pattern=r"^(telegram|kwork|fl_ru|freelancer|upwork)$")
    identifier: str | None = Field(default=None, max_length=255)
    is_enabled: bool = True


class SourceUpdate(BaseModel):
    is_enabled: bool


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source: str
    identifier: str
    is_enabled: bool
    status: str
    created_at: datetime


class SourceCatalogItem(BaseModel):
    source: str
    label: str
    kind: str
    capabilities: list[str]
    setup_note: str
