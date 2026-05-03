import pytest
from sqlalchemy import select

from app.core.config import Settings
from app.core.security import verify_password
from app.models.user import Profile, User


def test_register_creates_user_profile_and_returns_token(client, db_session):
    response = client.post(
        "/api/auth/register",
        json={"email": "alex@example.com", "username": "alexchen", "password": "secret123"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["user"] == {"id": body["user"]["id"], "email": "alex@example.com", "username": "alexchen"}

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "alex@example.com"

    user = db_session.scalar(select(User).where(User.id == body["user"]["id"]))
    assert user is not None
    profile = db_session.scalar(select(Profile).where(Profile.user_id == body["user"]["id"]))
    assert profile is not None
    assert profile.user_id == user.id
    assert user.password_hash != "secret123"
    assert verify_password("secret123", user.password_hash)


def test_register_rejects_duplicate_email(client):
    payload = {"email": "alex@example.com", "username": "alexchen", "password": "secret123"}
    assert client.post("/api/auth/register", json=payload).status_code == 201

    response = client.post(
        "/api/auth/register",
        json={"email": "alex@example.com", "username": "alex2", "password": "secret123"},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Email is already registered"


def test_login_returns_token_for_valid_credentials(client):
    client.post(
        "/api/auth/register",
        json={"email": "alex@example.com", "username": "alexchen", "password": "secret123"},
    )

    response = client.post("/api/auth/login", json={"email": "alex@example.com", "password": "secret123"})

    assert response.status_code == 200
    assert response.json()["access_token"]
    assert response.json()["user"]["username"] == "alexchen"


def test_login_rejects_invalid_password(client):
    client.post(
        "/api/auth/register",
        json={"email": "alex@example.com", "username": "alexchen", "password": "secret123"},
    )

    response = client.post("/api/auth/login", json={"email": "alex@example.com", "password": "wrongpass"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_me_requires_auth(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_me_rejects_invalid_bearer_token(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"})

    assert response.status_code == 401


def test_non_local_settings_reject_default_secret():
    with pytest.raises(ValueError, match="secret_key"):
        Settings(environment="production", secret_key="change-me-in-production")
