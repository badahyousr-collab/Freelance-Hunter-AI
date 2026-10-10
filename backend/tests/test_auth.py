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


def test_registration_requires_verification_then_allows_login(client: TestClient) -> None:
    response = client.post("/auth/register", json={"email": "test@example.com", "password": "correct-horse-battery"})
    assert response.status_code == 201
    token = response.json()["verification_token"]
    assert token

    before_verify = client.post("/auth/login", json={"email": "test@example.com", "password": "correct-horse-battery"})
    assert before_verify.status_code == 403

    verified = client.post("/auth/verify-email", json={"token": token})
    assert verified.status_code == 200

    login = client.post("/auth/login", json={"email": "test@example.com", "password": "correct-horse-battery"})
    assert login.status_code == 200
    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "test@example.com"
    assert "password_hash" not in me.json()


def test_duplicate_email_is_rejected(client: TestClient) -> None:
    payload = {"email": "duplicate@example.com", "password": "correct-horse-battery"}
    assert client.post("/auth/register", json=payload).status_code == 201
    assert client.post("/auth/register", json=payload).status_code == 409


def test_me_requires_authentication(client: TestClient) -> None:
    assert client.get("/auth/me").status_code == 401
