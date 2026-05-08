from app.models.page import GeneratedPage
from app.models.user import User
from tests.test_page_generation import auth_headers


def current_user(db_session) -> User:
    return db_session.query(User).filter_by(email="generate.owner@example.com").one()


def create_generated_page(
    db_session,
    user_id: str,
    html_content: str,
    version: int = 1,
    is_public: bool = False,
) -> GeneratedPage:
    page = GeneratedPage(
        user_id=user_id,
        html_content=html_content,
        style_template="clean-professional",
        version=version,
        is_public=is_public,
    )
    db_session.add(page)
    db_session.commit()
    db_session.refresh(page)
    return page


def test_public_page_serves_latest_public_page_html(client, db_session):
    headers = auth_headers(client)
    owner = current_user(db_session)
    create_generated_page(db_session, owner.id, "<!doctype html><html><body>Old public</body></html>", version=1, is_public=True)
    create_generated_page(db_session, owner.id, "<!doctype html><html><body>Latest public</body></html>", version=2, is_public=True)

    response = client.get("/p/generateowner")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "Latest public" in response.text
    assert "Old public" not in response.text
    assert headers["Authorization"]


def test_public_page_hides_private_pages(client, db_session):
    auth_headers(client)
    owner = current_user(db_session)
    create_generated_page(db_session, owner.id, "<!doctype html><html><body>Private draft</body></html>", is_public=False)

    response = client.get("/p/generateowner")

    assert response.status_code == 404
    assert "Private draft" not in response.text


def test_public_page_hides_older_public_page_when_latest_is_private(client, db_session):
    auth_headers(client)
    owner = current_user(db_session)
    create_generated_page(db_session, owner.id, "<!doctype html><html><body>Old public</body></html>", version=1, is_public=True)
    create_generated_page(
        db_session,
        owner.id,
        "<!doctype html><html><body>Latest private</body></html>",
        version=2,
        is_public=False,
    )

    response = client.get("/p/generateowner")

    assert response.status_code == 404
    assert "Old public" not in response.text
    assert "Latest private" not in response.text


def test_public_page_sets_restrictive_security_headers(client, db_session):
    auth_headers(client)
    owner = current_user(db_session)
    create_generated_page(
        db_session,
        owner.id,
        "<!doctype html><html><head><script>alert(1)</script></head><body onload='alert(2)'>Public</body></html>",
        is_public=True,
    )

    response = client.get("/p/generateowner")

    assert response.status_code == 200
    assert "script-src 'none'" in response.headers["content-security-policy"]
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["referrer-policy"] == "no-referrer"


def test_public_page_returns_404_for_missing_user_or_page(client, db_session):
    auth_headers(client)
    owner = current_user(db_session)
    create_generated_page(db_session, owner.id, "<!doctype html><html><body>Private draft</body></html>", is_public=False)

    assert client.get("/p/missing-user").status_code == 404


def test_page_settings_publishes_latest_page(client, db_session):
    headers = auth_headers(client)
    owner = current_user(db_session)
    old_page = create_generated_page(db_session, owner.id, "<!doctype html><html><body>Old</body></html>", version=1)
    latest_page = create_generated_page(db_session, owner.id, "<!doctype html><html><body>Latest</body></html>", version=2)

    response = client.patch("/api/page/settings", headers=headers, json={"is_public": True})

    assert response.status_code == 200
    assert response.json()["id"] == latest_page.id
    assert response.json()["is_public"] is True
    db_session.expire_all()
    assert db_session.get(GeneratedPage, latest_page.id).is_public is True
    assert db_session.get(GeneratedPage, old_page.id).is_public is False
    assert "Latest" in client.get("/p/generateowner").text


def test_page_settings_unpublishes_latest_page(client, db_session):
    headers = auth_headers(client)
    owner = current_user(db_session)
    old_page = create_generated_page(
        db_session,
        owner.id,
        "<!doctype html><html><body>Old public</body></html>",
        version=1,
        is_public=True,
    )
    latest_page = create_generated_page(
        db_session,
        owner.id,
        "<!doctype html><html><body>Latest</body></html>",
        version=2,
        is_public=True,
    )

    response = client.patch("/api/page/settings", headers=headers, json={"is_public": False})

    assert response.status_code == 200
    assert response.json()["id"] == latest_page.id
    assert response.json()["is_public"] is False
    db_session.expire_all()
    assert db_session.get(GeneratedPage, latest_page.id).is_public is False
    assert db_session.get(GeneratedPage, old_page.id).is_public is False
    assert client.get("/p/generateowner").status_code == 404


def test_page_settings_requires_existing_page(client):
    headers = auth_headers(client)

    response = client.patch("/api/page/settings", headers=headers, json={"is_public": True})

    assert response.status_code == 404
    assert response.json()["detail"] == "No generated page found"


def test_page_settings_requires_authentication(client):
    response = client.patch("/api/page/settings", json={"is_public": True})

    assert response.status_code == 401
