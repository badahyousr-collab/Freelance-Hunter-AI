from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class UserResponse(BaseModel):
    id: int
    auth_method: str = "telegram"
    telegram_user_id: int | None = None
    created_at: datetime


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=100)
    skills: list[str] = Field(default_factory=list, max_length=100)
    languages: list[str] = Field(default_factory=lambda: ["ru", "en"], max_length=10)
    min_budget: float | None = Field(default=None, ge=0, le=1_000_000_000)
    currency: str = Field(default="USD", min_length=3, max_length=8)
    payment_preferences: list[str] = Field(default_factory=list, max_length=10)
    excluded_keywords: list[str] = Field(default_factory=list, max_length=100)


class ProfileResponse(ProfileUpdate):
    model_config = ConfigDict(from_attributes=True)
    updated_at: datetime | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source: str
    source_project_id: str
    url: str
    title: str
    description: str
    language: str | None
    budget_min: float | None
    budget_max: float | None
    currency: str | None
    payment_method: str | None
    published_at: datetime | None
    discovered_at: datetime
    match_score: int | None = None
    match_reasons: list[str] = Field(default_factory=list)


class DashboardSummary(BaseModel):
    projects_found: int
    matched_projects: int
    proposals_sent: int
    client_replies: int


class ApplicationCreate(BaseModel):
    project_id: int
    draft_text: str | None = Field(default=None, max_length=12000)


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    status: str
    draft_text: str | None
    created_at: datetime
    submitted_at: datetime | None
    replied_at: datetime | None
    project: ProjectResponse | None = None


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
    last_scan_at: datetime | None = None
    last_error: str | None = None
    last_discovered_count: int = 0


class SourceCatalogItem(BaseModel):
    source: str
    label: str
    kind: str
    capabilities: list[str]
    setup_note: str


class TelegramLinkCodeResponse(BaseModel):
    code: str
    expires_in_seconds: int


class TelegramLinkRequest(BaseModel):
    code: str = Field(min_length=20, max_length=128)
    telegram_user_id: int = Field(gt=0)


class TelegramAgentControlRequest(BaseModel):
    telegram_user_id: int = Field(gt=0)
    enabled: bool


class AgentSettingsResponse(BaseModel):
    enabled: bool
    telegram_linked: bool


class IntegrationCreate(BaseModel):
    provider: str = Field(pattern=r"^(upwork|freelancer|kwork|fl_ru)$")
    secret: str = Field(min_length=8, max_length=10000)


class IntegrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    provider: str
    auth_method: str
    status: str
    created_at: datetime
    updated_at: datetime


class IntegrationCatalogItem(BaseModel):
    provider: str
    label: str
    status: str
    setup_note: str
