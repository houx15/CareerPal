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
        json={"name": "Alex Chen", "user_id": "not-allowed", "created_at": "2026-05-03"},
    )

    assert response.status_code == 422


def test_profile_patch_replaces_education_in_display_order(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "education": [
                {
                    "school": "University of Washington",
                    "degree": "B.S. Computer Science",
                    "time": "2023 - 2027",
                    "comment": "Systems track",
                },
                {
                    "school": "Bellevue College",
                    "degree": "Running Start",
                    "time": "2021 - 2023",
                },
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["education"] == [
        {
            "school": "University of Washington",
            "degree": "B.S. Computer Science",
            "time": "2023 - 2027",
            "comment": "Systems track",
        },
        {
            "school": "Bellevue College",
            "degree": "Running Start",
            "time": "2021 - 2023",
            "comment": None,
        },
    ]
    assert client.get("/api/profile", headers=headers).json()["education"] == response.json()["education"]


def test_profile_patch_replacing_education_with_shorter_list_removes_old_items(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "education": [
                {"school": "First University", "degree": "B.A.", "time": "2018 - 2022"},
                {"school": "Second University", "degree": "M.S.", "time": "2022 - 2024"},
            ]
        },
    )

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"education": [{"school": "Second University", "degree": "M.S.", "time": "2022 - 2024"}]},
    )

    assert response.status_code == 200
    assert response.json()["education"] == [
        {"school": "Second University", "degree": "M.S.", "time": "2022 - 2024", "comment": None}
    ]


def test_profile_patch_rejects_overlong_education_fields(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "education": [
                {
                    "school": "S" * 256,
                    "degree": "B.S. Computer Science",
                    "time": "2023 - 2027",
                }
            ]
        },
    )

    assert response.status_code == 422


def test_profile_patch_replaces_experience_in_display_order(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "experience": [
                {
                    "company": "Stripe",
                    "role": "Backend Engineering Intern",
                    "time": "Summer 2025",
                    "description": "Built reconciliation jobs for payment reporting.",
                    "achievements": ["Reduced manual review time by 30%"],
                    "comment": "Strong backend systems example",
                },
                {
                    "company": "Campus IT",
                    "role": "Student Developer",
                    "time": "2024 - 2025",
                    "description": "Maintained internal ticketing integrations.",
                    "achievements": [],
                },
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["experience"] == [
        {
            "company": "Stripe",
            "role": "Backend Engineering Intern",
            "time": "Summer 2025",
            "description": "Built reconciliation jobs for payment reporting.",
            "achievements": ["Reduced manual review time by 30%"],
            "comment": "Strong backend systems example",
        },
        {
            "company": "Campus IT",
            "role": "Student Developer",
            "time": "2024 - 2025",
            "description": "Maintained internal ticketing integrations.",
            "achievements": [],
            "comment": None,
        },
    ]
    assert client.get("/api/profile", headers=headers).json()["experience"] == response.json()["experience"]


def test_profile_patch_replacing_experience_with_shorter_list_removes_old_items(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "experience": [
                {"company": "First Co", "role": "Intern", "time": "2024", "description": "One", "achievements": []},
                {
                    "company": "Second Co",
                    "role": "Developer",
                    "time": "2025",
                    "description": "Two",
                    "achievements": [],
                },
            ]
        },
    )

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "experience": [
                {
                    "company": "Second Co",
                    "role": "Developer",
                    "time": "2025",
                    "description": "Two",
                    "achievements": [],
                }
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["experience"] == [
        {
            "company": "Second Co",
            "role": "Developer",
            "time": "2025",
            "description": "Two",
            "achievements": [],
            "comment": None,
        }
    ]


def test_profile_patch_defaults_optional_experience_fields(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"experience": [{"company": "Campus IT", "role": "Student Developer", "time": "2024 - 2025"}]},
    )

    assert response.status_code == 200
    assert response.json()["experience"] == [
        {
            "company": "Campus IT",
            "role": "Student Developer",
            "time": "2024 - 2025",
            "description": "",
            "achievements": [],
            "comment": None,
        }
    ]


def test_profile_patch_rejects_overlong_experience_fields(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "experience": [
                {
                    "company": "C" * 256,
                    "role": "Backend Engineering Intern",
                    "time": "Summer 2025",
                    "description": "Built reconciliation jobs.",
                    "achievements": [],
                }
            ]
        },
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


def test_completeness_reports_education_complete_when_required_fields_exist(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={"education": [{"school": "University of Washington", "degree": "B.S. CS", "time": "2023 - 2027"}]},
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["sections"]["education"] == "complete"
    assert response.json()["overall"] == "partial"


def test_completeness_reports_education_partial_when_items_are_incomplete(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={"education": [{"school": "University of Washington", "degree": "", "time": "2023 - 2027"}]},
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["sections"]["education"] == "partial"
    assert response.json()["overall"] == "partial"


def test_completeness_reports_experience_complete_when_required_fields_exist(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "experience": [
                {
                    "company": "Stripe",
                    "role": "Backend Engineering Intern",
                    "time": "Summer 2025",
                    "description": "Built reconciliation jobs.",
                    "achievements": ["Reduced manual review time by 30%"],
                }
            ]
        },
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["sections"]["experience"] == "complete"
    assert response.json()["overall"] == "partial"


def test_completeness_reports_experience_partial_when_items_are_incomplete(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "experience": [
                {"company": "Campus IT", "role": "", "time": "2024", "description": "", "achievements": []}
            ]
        },
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["sections"]["experience"] == "partial"
