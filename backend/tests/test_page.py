from datetime import datetime, timezone

from app.core.security import hash_password
from app.models.page import GeneratedPage
from app.models.user import User


def auth_headers(client, email="page.owner@example.com", username="pageowner"):
    response = client.post(
        "/api/auth/register",
        json={"email": email, "username": username, "password": "secret123"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_user(db_session, email: str, username: str) -> User:
    user = User(email=email, username=username, password_hash=hash_password("secret123"))
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def create_generated_page(
    db_session,
    user_id: str,
    version: int,
    html_content: str,
    style_template: str = "clean-professional",
    is_public: bool = False,
    created_at: datetime | None = None,
) -> GeneratedPage:
    page = GeneratedPage(
        user_id=user_id,
        html_content=html_content,
        style_template=style_template,
        version=version,
        is_public=is_public,
        created_at=created_at or datetime.now(timezone.utc),
    )
    db_session.add(page)
    db_session.commit()
    db_session.refresh(page)
    return page


def test_latest_page_preview_returns_current_users_highest_version(client, db_session):
    headers = auth_headers(client)
    owner = db_session.query(User).filter_by(email="page.owner@example.com").one()
    other = create_user(db_session, "other.page@example.com", "otherpage")
    create_generated_page(db_session, owner.id, 1, "<html>old</html>")
    latest = create_generated_page(db_session, owner.id, 2, "<html>latest</html>", is_public=True)
    create_generated_page(db_session, other.id, 9, "<html>other</html>")

    response = client.get("/api/page/preview", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "id": latest.id,
        "html_content": "<html>latest</html>",
        "style_template": "clean-professional",
        "version": 2,
        "is_public": True,
        "created_at": latest.created_at.isoformat().replace("+00:00", "Z"),
    }


def test_page_versions_returns_current_users_versions_newest_first(client, db_session):
    headers = auth_headers(client)
    owner = db_session.query(User).filter_by(email="page.owner@example.com").one()
    other = create_user(db_session, "other.history@example.com", "otherhistory")
    first = create_generated_page(
        db_session,
        owner.id,
        1,
        "<html>v1</html>",
        created_at=datetime(2026, 5, 1, tzinfo=timezone.utc),
    )
    second = create_generated_page(
        db_session,
        owner.id,
        2,
        "<html>v2</html>",
        style_template="technical",
        is_public=True,
        created_at=datetime(2026, 5, 2, tzinfo=timezone.utc),
    )
    create_generated_page(
        db_session,
        other.id,
        3,
        "<html>other</html>",
        created_at=datetime(2026, 5, 3, tzinfo=timezone.utc),
    )

    response = client.get("/api/page/versions", headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "versions": [
            {
                "id": second.id,
                "style_template": "technical",
                "version": 2,
                "is_public": True,
                "created_at": second.created_at.isoformat().replace("+00:00", "Z"),
            },
            {
                "id": first.id,
                "style_template": "clean-professional",
                "version": 1,
                "is_public": False,
                "created_at": first.created_at.isoformat().replace("+00:00", "Z"),
            },
        ]
    }


def test_page_preview_returns_404_when_user_has_no_pages(client):
    headers = auth_headers(client)

    response = client.get("/api/page/preview", headers=headers)

    assert response.status_code == 404
    assert response.json()["detail"] == "No generated page found"


def test_page_endpoints_require_authentication(client):
    preview = client.get("/api/page/preview")
    versions = client.get("/api/page/versions")

    assert preview.status_code == 401
    assert versions.status_code == 401
