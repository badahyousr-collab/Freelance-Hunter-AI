from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "Freelance Hunter AI"
    web_origin: str = "http://localhost:3000"
    database_url: str = "sqlite:///./fhai.db"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "local-only-change-this-secret-before-deploying"
    access_token_minutes: int = 30
    verification_token_minutes: int = 30
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    email_from: str | None = None
    telegram_api_id: int | None = None
    telegram_api_hash: str | None = None
    telegram_session: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
