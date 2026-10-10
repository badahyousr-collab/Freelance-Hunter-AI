from datetime import datetime
from typing import Protocol

from pydantic import BaseModel, Field, HttpUrl


class NormalizedProject(BaseModel):
    source: str = Field(min_length=1, max_length=80)
    source_project_id: str = Field(min_length=1, max_length=255)
    url: HttpUrl
    title: str = Field(min_length=1, max_length=500)
    description: str = Field(default="", max_length=30000)
    language: str | None = Field(default=None, max_length=8)
    budget_min: float | None = Field(default=None, ge=0)
    budget_max: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=8)
    payment_method: str | None = Field(default=None, max_length=80)
    published_at: datetime | None = None


class SourceCapabilities(BaseModel):
    discovery: bool = False
    account_connection: bool = False
    proposal_submission: bool = False
    reply_sync: bool = False


class SourceAdapter(Protocol):
    name: str
    capabilities: SourceCapabilities

    async def discover(self, **kwargs: object) -> list[NormalizedProject]: ...
