from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import get_current_user
from app.database import Base, get_db
from app.main import app
from app import models  # noqa: F401 - register ORM models with Base metadata


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.mark.parametrize("path", ["/auth/register", "/auth/login", "/auth/verify-email"])
def test_email_auth_endpoints_are_disabled(client: TestClient, path: str) -> None:
    response = client.post(path, json={"email": "test@example.com", "password": "long-enough-password", "token": "old-token"})
    assert response.status_code == 410
    assert "Telegram" in response.json()["detail"]


def test_me_requires_authentication(client: TestClient) -> None:
    assert client.get("/auth/me").status_code == 401


def test_logout_clears_session_cookie(client: TestClient) -> None:
    response = client.post("/auth/logout")
    assert response.status_code == 200
    assert "access_token" in response.headers.get("set-cookie", "")
    assert "Max-Age=0" in response.headers.get("set-cookie", "")


def test_production_settings_reject_placeholder_secrets() -> None:
    from pydantic import ValidationError
    from app.config import Settings

    with pytest.raises(ValidationError):
        Settings(app_env="production", jwt_secret="local-only-change-this-secret-before-deploying", bot_api_secret="real-random-secret")
