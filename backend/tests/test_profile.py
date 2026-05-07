from datetime import datetime

import pytest


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


def test_profile_patch_replaces_projects_in_display_order(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "projects": [
                {
                    "name": "CareerPal",
                    "description": "Built a career companion workspace.",
                    "tech_stack": ["Next.js", "FastAPI"],
                    "achievements": ["Persisted profile project data end to end"],
                    "link": "https://example.com/careerpal",
                    "comment": "Strong full-stack project",
                },
                {
                    "name": "Campus Planner",
                    "description": "Created a student schedule planner.",
                    "tech_stack": ["React"],
                    "achievements": [],
                },
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["projects"] == [
        {
            "name": "CareerPal",
            "description": "Built a career companion workspace.",
            "tech_stack": ["Next.js", "FastAPI"],
            "achievements": ["Persisted profile project data end to end"],
            "link": "https://example.com/careerpal",
            "comment": "Strong full-stack project",
            "completeness": "complete",
        },
        {
            "name": "Campus Planner",
            "description": "Created a student schedule planner.",
            "tech_stack": ["React"],
            "achievements": [],
            "link": None,
            "comment": None,
            "completeness": "partial",
        },
    ]
    assert client.get("/api/profile", headers=headers).json()["projects"] == response.json()["projects"]


def test_profile_patch_replacing_projects_with_shorter_list_removes_old_items(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "projects": [
                {"name": "First", "description": "One", "tech_stack": ["React"], "achievements": []},
                {"name": "Second", "description": "Two", "tech_stack": ["FastAPI"], "achievements": []},
            ]
        },
    )

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"projects": [{"name": "Second", "description": "Two", "tech_stack": ["FastAPI"], "achievements": []}]},
    )

    assert response.status_code == 200
    assert response.json()["projects"] == [
        {
            "name": "Second",
            "description": "Two",
            "tech_stack": ["FastAPI"],
            "achievements": [],
            "link": None,
            "comment": None,
            "completeness": "partial",
        }
    ]


def test_profile_patch_defaults_optional_project_fields(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"projects": [{"name": "Campus Planner", "description": "Built scheduling views."}]},
    )

    assert response.status_code == 200
    assert response.json()["projects"] == [
        {
            "name": "Campus Planner",
            "description": "Built scheduling views.",
            "tech_stack": [],
            "achievements": [],
            "link": None,
            "comment": None,
            "completeness": "partial",
        }
    ]


def test_profile_patch_accepts_project_completeness_when_provided(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "projects": [
                {
                    "name": "CareerPal",
                    "description": "Built profile persistence.",
                    "tech_stack": ["Next.js"],
                    "achievements": ["Saved projects across reloads"],
                    "completeness": "complete",
                }
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["projects"][0]["completeness"] == "complete"


def test_profile_patch_rejects_overlong_project_fields(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"projects": [{"name": "P" * 256, "description": "Built scheduling views."}]},
    )

    assert response.status_code == 422


def test_profile_patch_replaces_skills_in_display_order(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "skills": [
                {
                    "name": "Python",
                    "category": "Programming",
                    "proficiency": "advanced",
                    "comment": "Built FastAPI services",
                },
                {
                    "name": "PostgreSQL",
                    "category": "Database",
                    "proficiency": "intermediate",
                },
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["skills"] == [
        {
            "name": "Python",
            "category": "Programming",
            "proficiency": "advanced",
            "comment": "Built FastAPI services",
        },
        {
            "name": "PostgreSQL",
            "category": "Database",
            "proficiency": "intermediate",
            "comment": None,
        },
    ]
    assert client.get("/api/profile", headers=headers).json()["skills"] == response.json()["skills"]


def test_profile_patch_replaces_skills_with_empty_list(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={"skills": [{"name": "Python", "category": "Programming", "proficiency": "advanced"}]},
    )

    response = client.patch("/api/profile", headers=headers, json={"skills": []})

    assert response.status_code == 200
    assert response.json()["skills"] == []
    assert client.get("/api/profile", headers=headers).json()["skills"] == []


def test_profile_patch_replaces_certificates_in_display_order(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={
            "certificates": [
                {
                    "name": "AWS Certified Cloud Practitioner",
                    "issuer": "Amazon Web Services",
                    "date": "2025-04-15",
                    "comment": "Cloud foundation",
                },
                {
                    "name": "Scrum Fundamentals",
                    "issuer": "ScrumStudy",
                    "date": "2024-10-01",
                },
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["certificates"] == [
        {
            "name": "AWS Certified Cloud Practitioner",
            "issuer": "Amazon Web Services",
            "date": "2025-04-15",
            "comment": "Cloud foundation",
        },
        {
            "name": "Scrum Fundamentals",
            "issuer": "ScrumStudy",
            "date": "2024-10-01",
            "comment": None,
        },
    ]
    assert client.get("/api/profile", headers=headers).json()["certificates"] == response.json()["certificates"]


def test_profile_patch_replaces_certificates_with_empty_list(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={"certificates": [{"name": "AWS CCP", "issuer": "AWS", "date": "2025-04-15"}]},
    )

    response = client.patch("/api/profile", headers=headers, json={"certificates": []})

    assert response.status_code == 200
    assert response.json()["certificates"] == []
    assert client.get("/api/profile", headers=headers).json()["certificates"] == []


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", "C" * 256),
        ("issuer", "I" * 256),
        ("date", "D" * 121),
    ],
)
def test_profile_patch_rejects_overlong_certificate_fields(client, field, value):
    headers = auth_headers(client)
    certificate = {"name": "AWS CCP", "issuer": "AWS", "date": "2025-04-15"}
    certificate[field] = value

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"certificates": [certificate]},
    )

    assert response.status_code == 422


def test_profile_patch_rejects_malformed_certificate_date(client):
    headers = auth_headers(client)

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"certificates": [{"name": "AWS CCP", "issuer": "AWS", "date": "not a date"}]},
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
            "contact": "empty",
            "summary": "empty",
            "experience": "empty",
            "skills": "empty",
            "projects": "empty",
            "education": "empty",
            "certificates": "empty",
        },
    }


def test_completeness_reports_empty_profile_contract(client):
    headers = auth_headers(client)

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "overall": "empty",
        "sections": {
            "basics": "empty",
            "contact": "empty",
            "summary": "empty",
            "experience": "empty",
            "skills": "empty",
            "projects": "empty",
            "education": "empty",
            "certificates": "empty",
        },
    }


def test_completeness_reports_sparse_profile_as_partial_contract(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "name": "Alex Chen",
            "phone": "+1 555 0100",
            "education": [{"school": "University of Washington", "degree": "", "time": ""}],
            "experience": [{"company": "Campus IT", "role": "", "time": "", "description": "", "achievements": []}],
            "projects": [{"name": "CareerPal"}],
            "skills": [{"name": "Python", "category": "", "proficiency": "advanced"}],
            "certificates": [{"name": "AWS CCP", "issuer": "", "date": "2025-04-15"}],
        },
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["overall"] == "partial"
    assert response.json()["sections"] == {
        "basics": "partial",
        "contact": "partial",
        "summary": "empty",
        "experience": "partial",
        "skills": "partial",
        "projects": "partial",
        "education": "partial",
        "certificates": "partial",
    }


def test_completeness_reports_complete_profile_contract(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "name": "Alex Chen",
            "headline": "Backend engineer",
            "target_direction": "Platform engineering",
            "phone": "+1 555 0100",
            "contact_email": "alex.contact@example.com",
            "location": "Seattle, WA",
            "comment": "I build reliable student tools.",
            "education": [{"school": "University of Washington", "degree": "B.S. CS", "time": "2023 - 2027"}],
            "experience": [
                {
                    "company": "Stripe",
                    "role": "Backend Engineering Intern",
                    "time": "Summer 2025",
                    "description": "Built reconciliation jobs.",
                    "achievements": ["Reduced manual review time by 30%"],
                }
            ],
            "projects": [
                {
                    "name": "CareerPal",
                    "description": "Built profile persistence.",
                    "tech_stack": ["Next.js"],
                    "achievements": ["Saved profile data"],
                }
            ],
            "skills": [{"name": "Python", "category": "Programming", "proficiency": "advanced"}],
            "certificates": [{"name": "AWS CCP", "issuer": "AWS", "date": "2025-04-15"}],
        },
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["overall"] == "complete"
    assert set(response.json()["sections"].values()) == {"complete"}


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


def test_completeness_reports_projects_complete_when_required_fields_exist(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "projects": [
                {
                    "name": "CareerPal",
                    "description": "Built profile persistence.",
                    "tech_stack": ["Next.js"],
                    "achievements": ["Saved projects across reloads"],
                }
            ]
        },
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["sections"]["projects"] == "complete"


def test_completeness_reports_projects_partial_when_items_are_incomplete(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={"projects": [{"name": "CareerPal", "description": "Built profile persistence."}]},
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["sections"]["projects"] == "partial"


def test_completeness_reports_skill_empty_partial_and_complete_states(client):
    headers = auth_headers(client)

    empty_response = client.get("/api/profile/completeness", headers=headers)

    assert empty_response.status_code == 200
    assert empty_response.json()["sections"]["skills"] == "empty"

    client.patch(
        "/api/profile",
        headers=headers,
        json={"skills": [{"name": "Python", "category": "", "proficiency": "advanced"}]},
    )
    partial_response = client.get("/api/profile/completeness", headers=headers)

    assert partial_response.status_code == 200
    assert partial_response.json()["sections"]["skills"] == "partial"
    assert partial_response.json()["overall"] == "partial"

    client.patch(
        "/api/profile",
        headers=headers,
        json={"skills": [{"name": "Python", "category": "Programming", "proficiency": "advanced"}]},
    )
    complete_response = client.get("/api/profile/completeness", headers=headers)

    assert complete_response.status_code == 200
    assert complete_response.json()["sections"]["skills"] == "complete"
    assert complete_response.json()["overall"] == "partial"


def test_completeness_reports_certificates_complete_when_required_fields_exist(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={"certificates": [{"name": "AWS CCP", "issuer": "AWS", "date": "2025-04-15"}]},
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["sections"]["certificates"] == "complete"


def test_completeness_reports_certificates_partial_when_items_are_incomplete(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={"certificates": [{"name": "AWS CCP", "issuer": "", "date": "2025-04-15"}]},
    )

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json()["sections"]["certificates"] == "partial"
