from datetime import datetime


def auth_headers(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "alex@example.com", "username": "alexchen", "password": "secret123"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_profile_starts_empty_with_structured_sections(client):
    response = client.get("/api/profile", headers=auth_headers(client))

    assert response.status_code == 200
    body = response.json()
    assert body["name"] is None
    assert body["phone"] is None
    assert body["contact_email"] is None
    assert body["location"] is None
    assert body["education"] == []
    assert body["experience"] == []
    assert body["projects"] == []
    assert body["skills"] == []
    assert body["certificates"] == []


def test_profile_patch_persists_allowed_fields(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"name": "Alex Chen", "headline": "CS student", "target_direction": "Backend SWE", "comment": "Prefers internships"},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Alex Chen"
    assert client.get("/api/profile", headers=headers).json()["target_direction"] == "Backend SWE"


def test_profile_patch_persists_contact_fields(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "phone": "+1 555 123 4567",
            "contact_email": "alex.contact@example.com",
            "location": "Seattle, WA",
        },
    )

    assert response.status_code == 200
    assert response.json()["phone"] == "+1 555 123 4567"
    profile = client.get("/api/profile", headers=headers).json()
    assert profile["contact_email"] == "alex.contact@example.com"
    assert profile["location"] == "Seattle, WA"


def test_profile_patch_updates_updated_at(client):
    headers = auth_headers(client)
    before = client.get("/api/profile", headers=headers).json()["updated_at"]

    response = client.patch("/api/profile", headers=headers, json={"name": "Alex Chen"})

    assert response.status_code == 200
    after = response.json()["updated_at"]
    assert datetime.fromisoformat(after) > datetime.fromisoformat(before)


def test_profile_patch_rejects_unknown_fields(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"name": "Alex Chen", "user_id": "not-allowed", "created_at": "2026-05-03", "education": []},
    )

    assert response.status_code == 422


def test_completeness_reflects_name_and_empty_sections(client):
    headers = auth_headers(client)
    client.patch("/api/profile", headers=headers, json={"name": "Alex Chen"})

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "overall": "partial",
        "sections": {
            "basics": "partial",
            "summary": "empty",
            "experience": "empty",
            "skills": "empty",
            "projects": "empty",
            "education": "empty",
        },
    }
