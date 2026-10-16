from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "Freelance Hunter AI"
    web_origin: str = "http://localhost:3000"
    database_url: str = "sqlite:///./fhai.db"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "local-only-change-this-secret-before-deploying"
    access_token_minutes: int = 30
    telegram_api_id: int | None = None
    telegram_api_hash: str | None = None
    telegram_session: str | None = None
    bot_api_secret: str = "development-only-change-me"
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = None
    integration_encryption_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False, env_ignore_empty=True)

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.app_env.lower() not in {"development", "test"}:
            if self.jwt_secret == "local-only-change-this-secret-before-deploying" or "replace-with" in self.jwt_secret:
                raise ValueError("JWT_SECRET must be set to a unique secret outside development")
            if self.bot_api_secret == "development-only-change-me" or "replace-with" in self.bot_api_secret:
                raise ValueError("BOT_API_SECRET must be set to a unique secret outside development")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
