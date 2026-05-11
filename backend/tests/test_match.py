import json

from tests.test_page_generation import auth_headers, update_profile
from app.models.page import GeneratedPage


class CapturingMatchLLMClient:
    def __init__(self, chunks: list[str]):
        self.chunks = chunks
        self.messages = None

    async def stream_chat(self, messages):
        self.messages = messages
        for chunk in self.chunks:
            yield chunk


class TargetedPageLLMClient:
    def __init__(self, html: str = "<!doctype html><html><body>Targeted resume</body></html>"):
        self.html = html
        self.messages = None

    async def stream_chat(self, messages):
        self.messages = list(messages)
        yield self.html


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


def test_match_analysis_uses_llm_profile_context_and_persists_structured_result(client, monkeypatch):
    headers = auth_headers(client)
    update_profile(
        client,
        headers,
        name="Maya Chen",
        headline="Backend software engineering student",
        target_direction="Platform engineering",
        education=[
            {
                "school": "University of Washington",
                "degree": "B.S. Computer Science",
                "time": "2023 - 2027",
                "comment": "Systems coursework.",
            }
        ],
        projects=[
            {
                "name": "Career Graph",
                "description": "Mapped projects to skills for internship applications.",
                "tech_stack": ["Python", "React"],
                "achievements": ["Reduced resume tailoring time by 40%"],
                "completeness": "complete",
            }
        ],
        skills=[
            {"name": "Python", "category": "Backend", "proficiency": "advanced"},
            {"name": "React", "category": "Frontend", "proficiency": "intermediate"},
        ],
    )
    provider_payload = {
        "company": "Stripe",
        "role": "Backend Engineering Intern",
        "score": 88,
        "strengths": ["Strong Python project evidence.", "Clear platform engineering direction."],
        "gaps": ["Add SQL reliability examples."],
        "suggestions": ["Add a backend-focused project bullet.", "Quantify service reliability impact."],
    }
    fake_client = CapturingMatchLLMClient([json.dumps(provider_payload)])

    from app.api import match as match_api

    monkeypatch.setattr(match_api, "build_llm_client", lambda settings: fake_client)

    job_description = "Company: Stripe\nRole: Backend Engineering Intern\nPython, SQL, and reliability work."
    response = client.post("/api/match/analyze", headers=headers, json={"job_description": job_description})

    assert response.status_code == 201
    body = response.json()
    assert body["company"] == "Stripe"
    assert body["role"] == "Backend Engineering Intern"
    assert body["score"] == 88
    assert body["strengths"] == provider_payload["strengths"]
    assert body["gaps"] == provider_payload["gaps"]
    assert body["suggestions"] == provider_payload["suggestions"]

    assert fake_client.messages is not None
    prompt = "\n".join(message.content for message in fake_client.messages)
    assert "Maya Chen" in prompt
    assert "University of Washington" in prompt
    assert "B.S. Computer Science" in prompt
    assert "Career Graph" in prompt
    assert "Platform engineering" in prompt
    assert job_description in prompt
    assert "Return only JSON" in prompt

    history = client.get("/api/match/history", headers=headers)
    assert history.status_code == 200
    assert history.json()["analyses"][0]["score"] == 88


def test_match_analysis_rejects_malformed_llm_output_without_persisting(client, monkeypatch):
    headers = auth_headers(client)
    fake_client = CapturingMatchLLMClient(["not json"])

    from app.api import match as match_api

    monkeypatch.setattr(match_api, "build_llm_client", lambda settings: fake_client)

    response = client.post(
        "/api/match/analyze",
        headers=headers,
        json={"job_description": "Backend Engineering Intern at Stripe\nPython and SQL role."},
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "LLM provider returned invalid match analysis"

    history = client.get("/api/match/history", headers=headers)
    assert history.status_code == 200
    assert history.json()["analyses"] == []


def test_match_analysis_rejects_schema_invalid_llm_output_without_persisting(client, monkeypatch):
    headers = auth_headers(client)
    fake_client = CapturingMatchLLMClient(
        [
            json.dumps(
                {
                    "company": "Stripe",
                    "role": "Backend Engineering Intern",
                    "score": True,
                    "strengths": ["Python evidence"],
                    "gaps": ["SQL evidence"],
                    "suggestions": ["Add SQL bullet"],
                }
            )
        ]
    )

    from app.api import match as match_api

    monkeypatch.setattr(match_api, "build_llm_client", lambda settings: fake_client)

    response = client.post(
        "/api/match/analyze",
        headers=headers,
        json={"job_description": "Backend Engineering Intern at Stripe\nPython and SQL role."},
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "LLM provider returned invalid match analysis"
    assert client.get("/api/match/history", headers=headers).json()["analyses"] == []


def test_save_targeted_version_creates_page_and_links_match_history(client, db_session, monkeypatch):
    headers = auth_headers(client)
    update_profile(client, headers, name="Maya Chen", headline="Backend student")
    analysis = client.post(
        "/api/match/analyze",
        headers=headers,
        json={"job_description": "Company: Stripe\nRole: Backend Engineering Intern\nPython and SQL role."},
    ).json()
    page_llm = TargetedPageLLMClient(
        "<!doctype html><html><body><h1>Maya Chen</h1><section>Backend Engineering Intern at Stripe</section></body></html>"
    )

    from app.api import match as match_api

    monkeypatch.setattr(match_api, "build_llm_client", lambda settings: page_llm)

    response = client.post(
        f"/api/match/{analysis['id']}/save-version",
        headers=headers,
        json={"style_template": "technical"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["version"] == 1
    assert body["style_template"] == "technical"
    assert body["source_match_id"] == analysis["id"]
    assert body["target_role"] == "Backend Engineering Intern"
    assert body["target_company"] == "Stripe"
    assert "Backend Engineering Intern at Stripe" in body["html_content"]
    prompt_text = "\n".join(message.content for message in page_llm.messages)
    assert "Match analysis JSON" in prompt_text
    assert "Add evidence for SQL" in prompt_text

    page = db_session.query(GeneratedPage).one()
    assert page.source_match_id == analysis["id"]
    assert page.target_role == "Backend Engineering Intern"
    assert page.target_company == "Stripe"

    history = client.get("/api/match/history", headers=headers).json()["analyses"]
    assert history[0]["saved_page_id"] == body["id"]
    assert history[0]["saved_page_version"] == 1

    versions = client.get("/api/page/versions", headers=headers).json()["versions"]
    assert versions == [
        {
            "id": body["id"],
            "style_template": "technical",
            "version": 1,
            "is_public": False,
            "created_at": body["created_at"],
            "source_match_id": analysis["id"],
            "target_role": "Backend Engineering Intern",
            "target_company": "Stripe",
        }
    ]


def test_save_targeted_version_requires_match_ownership(client, monkeypatch):
    owner_headers = auth_headers(client, email="owner.target@example.com", username="ownertarget")
    other_headers = auth_headers(client, email="other.target@example.com", username="othertarget")
    analysis = client.post(
        "/api/match/analyze",
        headers=owner_headers,
        json={"job_description": "Frontend Engineer at Vercel\nReact role."},
    ).json()

    response = client.post(
        f"/api/match/{analysis['id']}/save-version",
        headers=other_headers,
        json={"style_template": "clean-professional"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Match analysis not found"


def test_save_targeted_version_rolls_back_page_when_linking_fails(client, db_session, monkeypatch):
    headers = auth_headers(client)
    analysis = client.post(
        "/api/match/analyze",
        headers=headers,
        json={"job_description": "Company: Stripe\nRole: Backend Engineering Intern\nPython and SQL role."},
    ).json()

    from app.api import match as match_api

    monkeypatch.setattr(match_api, "build_llm_client", lambda settings: TargetedPageLLMClient())

    def fail_after_page_flush(db, current_user, analysis, html_content, style_template):
        page = GeneratedPage(
            user_id=current_user.id,
            html_content=html_content,
            style_template=style_template,
            version=1,
            is_public=False,
            source_match_id=analysis.id,
            target_role=analysis.role,
            target_company=analysis.company,
        )
        db.add(page)
        db.flush()
        raise RuntimeError("linking failed")

    monkeypatch.setattr(match_api, "_persist_targeted_page_and_link", fail_after_page_flush)

    response = client.post(
        f"/api/match/{analysis['id']}/save-version",
        headers=headers,
        json={"style_template": "technical"},
    )

    assert response.status_code == 502
    assert db_session.query(GeneratedPage).count() == 0
