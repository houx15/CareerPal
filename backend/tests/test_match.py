from tests.test_page_generation import auth_headers, update_profile


def test_match_analysis_requires_authentication(client):
    response = client.post("/api/match/analyze", json={"job_description": "Backend internship using Python"})

    assert response.status_code == 401

    assert client.get("/api/match/history").status_code == 401
    assert client.get("/api/match/some-id").status_code == 401


def test_match_analysis_rejects_blank_jd(client):
    headers = auth_headers(client)

    response = client.post("/api/match/analyze", headers=headers, json={"job_description": "   "})

    assert response.status_code == 422


def test_match_analysis_persists_detected_role_company_and_suggestions(client):
    headers = auth_headers(client)
    update_profile(
        client,
        headers,
        name="Maya Chen",
        headline="Backend software engineering student",
        projects=[
            {
                "name": "Career Graph",
                "description": "Mapped projects to skills for internship applications.",
                "tech_stack": ["Python", "React"],
                "achievements": ["Reduced resume tailoring time by 40%"],
                "link": "https://example.com/career-graph",
                "completeness": "complete",
            }
        ],
        skills=[
            {"name": "Python", "category": "Backend", "proficiency": "advanced"},
            {"name": "React", "category": "Frontend", "proficiency": "intermediate"},
        ],
    )
    job_description = """Company: Stripe
Role: Backend Engineering Intern

We are looking for a student who has used Python, SQL, and distributed systems to build reliable tools."""

    response = client.post("/api/match/analyze", headers=headers, json={"job_description": f"  {job_description}  "})

    assert response.status_code == 201
    body = response.json()
    assert body["id"]
    assert body["job_description"] == job_description
    assert body["role"] == "Backend Engineering Intern"
    assert body["company"] == "Stripe"
    assert 0 <= body["score"] <= 100
    assert body["score"] >= 60
    assert any("Python" in strength for strength in body["strengths"])
    assert any("SQL" in gap for gap in body["gaps"])
    assert body["suggestions"]
    assert body["created_at"]

    history = client.get("/api/match/history", headers=headers)
    assert history.status_code == 200
    assert history.json()["analyses"][0]["id"] == body["id"]

    detail = client.get(f"/api/match/{body['id']}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["id"] == body["id"]


def test_match_history_is_newest_first_and_current_user_only(client):
    owner_headers = auth_headers(client, email="match.owner@example.com", username="matchowner")
    other_headers = auth_headers(client, email="match.other@example.com", username="matchother")

    first = client.post(
        "/api/match/analyze",
        headers=owner_headers,
        json={"job_description": "Frontend Engineer at Vercel\nReact and TypeScript role."},
    ).json()
    second = client.post(
        "/api/match/analyze",
        headers=owner_headers,
        json={"job_description": "Backend Intern at Stripe\nPython and SQL role."},
    ).json()
    other = client.post(
        "/api/match/analyze",
        headers=other_headers,
        json={"job_description": "Data Intern at Datadog\nPython role."},
    ).json()

    response = client.get("/api/match/history", headers=owner_headers)

    assert response.status_code == 200
    analyses = response.json()["analyses"]
    assert [analysis["id"] for analysis in analyses] == [second["id"], first["id"]]
    assert all(analysis["company"] != "Datadog" for analysis in analyses)

    hidden = client.get(f"/api/match/{other['id']}", headers=owner_headers)
    assert hidden.status_code == 404
    assert hidden.json()["detail"] == "Match analysis not found"
