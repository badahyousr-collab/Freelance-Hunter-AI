from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app import models  # noqa: F401


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
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


def create_verified_user(client: TestClient, email: str) -> None:
    registered = client.post("/auth/register", json={"email": email, "password": "long-secure-password"})
    assert registered.status_code == 201
    token = registered.json()["verification_token"]
    assert client.post("/auth/verify-email", json={"token": token}).status_code == 200
    assert client.post("/auth/login", json={"email": email, "password": "long-secure-password"}).status_code == 200


def test_profile_update_is_persisted_and_normalized(client: TestClient) -> None:
    create_verified_user(client, "profile@example.com")
    saved = client.put("/profile", json={
        "display_name": "Developer",
        "skills": [" Python ", "Telegram bots", "Python"],
        "languages": ["RU", "en", "ru"],
        "min_budget": 100,
        "currency": "USD",
        "payment_preferences": ["Crypto", "Bank", "crypto"],
        "excluded_keywords": ["free", "FREE"],
    })
    assert saved.status_code == 200
    body = saved.json()
    assert body["skills"] == ["Python", "Telegram bots"]
    assert body["languages"] == ["ru", "en"]
    assert body["payment_preferences"] == ["crypto", "bank"]
    assert body["excluded_keywords"] == ["free"]
    assert client.get("/profile").json()["display_name"] == "Developer"


def test_dashboard_counts_are_real_and_empty_initially(client: TestClient) -> None:
    create_verified_user(client, "dashboard@example.com")
    response = client.get("/dashboard/summary")
    assert response.status_code == 200
    assert response.json() == {
        "projects_found": 0,
        "matched_projects": 0,
        "proposals_sent": 0,
        "client_replies": 0,
    }


def test_workspace_endpoints_require_authentication(client: TestClient) -> None:
    assert client.get("/profile").status_code == 401
    assert client.get("/projects").status_code == 401
    assert client.get("/dashboard/summary").status_code == 401
    assert client.get("/applications").status_code == 401
