from datetime import date

from app.api import page as page_api
from app.core.security import hash_password
from app.models.page import GeneratedPage
from app.models.user import User


class StubLLMClient:
    def __init__(self, html: str = "<!doctype html><html><body>Generated</body></html>", error: Exception | None = None):
        self.html = html
        self.error = error
        self.messages = None

    async def stream_chat(self, messages):
        self.messages = list(messages)
        if self.error:
            raise self.error
        midpoint = len(self.html) // 2
        for chunk in [self.html[:midpoint], self.html[midpoint:]]:
            yield chunk


def auth_headers(client, email="generate.owner@example.com", username="generateowner"):
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


def update_profile(client, headers, **overrides):
    payload = {
        "name": "Maya Chen",
        "contact_email": "maya@example.com",
        "location": "Seattle, WA",
        "headline": "Computer science student building reliable tools",
        "target_direction": "Backend software engineering",
        "comment": "Interested in developer productivity.",
        "projects": [
            {
                "name": "Career Graph",
                "description": "Mapped projects to skills for internship applications.",
                "tech_stack": ["Python", "React"],
                "achievements": ["Reduced resume tailoring time by 40%"],
                "link": "https://example.com/career-graph",
                "completeness": "complete",
            }
        ],
        "skills": [{"name": "Python", "category": "Backend", "proficiency": "advanced"}],
    }
    payload.update(overrides)
    response = client.patch("/api/profile", headers=headers, json=payload)
    assert response.status_code == 200


def test_generate_page_persists_first_version_from_selected_template(client, db_session, monkeypatch):
    headers = auth_headers(client)
    update_profile(client, headers)
    llm = StubLLMClient("<!doctype html><html><body><h1>Maya Chen</h1><section>Career Graph</section></body></html>")
    monkeypatch.setattr(page_api, "build_llm_client", lambda settings: llm, raising=False)

    response = client.post("/api/page/generate", headers=headers, json={"style_template": "modern-creative"})

    assert response.status_code == 200
    body = response.json()
    assert body["html_content"] == llm.html
    assert body["style_template"] == "modern-creative"
    assert body["version"] == 1
    assert body["is_public"] is False
    pages = db_session.query(GeneratedPage).all()
    assert len(pages) == 1
    assert pages[0].html_content == llm.html


def test_generate_page_increments_versions_per_user(client, db_session, monkeypatch):
    headers = auth_headers(client)
    update_profile(client, headers)
    owner = db_session.query(User).filter_by(email="generate.owner@example.com").one()
    other = create_user(db_session, "other.generate@example.com", "othergenerate")
    db_session.add_all(
        [
            GeneratedPage(user_id=owner.id, html_content="<html>v1</html>", style_template="technical", version=1),
            GeneratedPage(user_id=other.id, html_content="<html>v9</html>", style_template="technical", version=9),
        ]
    )
    db_session.commit()
    llm = StubLLMClient("<!doctype html><html><body>Maya Chen v2</body></html>")
    monkeypatch.setattr(page_api, "build_llm_client", lambda settings: llm, raising=False)

    response = client.post("/api/page/generate", headers=headers, json={"style_template": "technical"})

    assert response.status_code == 200
    assert response.json()["version"] == 2


def test_generate_page_prompt_uses_profile_data_and_omits_empty_sections(client, monkeypatch):
    headers = auth_headers(client)
    update_profile(client, headers, education=[], experience=[], certificates=[])
    llm = StubLLMClient("<!doctype html><html><body>Maya Chen Career Graph Python</body></html>")
    monkeypatch.setattr(page_api, "build_llm_client", lambda settings: llm, raising=False)

    response = client.post("/api/page/generate", headers=headers, json={"style_template": "clean-professional"})

    assert response.status_code == 200
    prompt_text = "\n".join(message.content for message in llm.messages)
    assert "Maya Chen" in prompt_text
    assert "Career Graph" in prompt_text
    assert "Python" in prompt_text
    assert "education" not in prompt_text.lower()
    assert "experience" not in prompt_text.lower()
    assert "certificates" not in prompt_text.lower()
    assert "Only use information from the provided profile data" in prompt_text


def test_generate_page_supports_all_three_built_in_templates(client, monkeypatch):
    headers = auth_headers(client)
    update_profile(client, headers)
    llm = StubLLMClient("<!doctype html><html><body>Maya Chen</body></html>")
    monkeypatch.setattr(page_api, "build_llm_client", lambda settings: llm, raising=False)
    expected_reference_markers = {
        "clean-professional": "cp-clean-page",
        "modern-creative": "cp-modern-page",
        "technical": "cp-technical-page",
    }

    for template in ["clean-professional", "modern-creative", "technical"]:
        response = client.post("/api/page/generate", headers=headers, json={"style_template": template})
        assert response.status_code == 200
        assert response.json()["style_template"] == template
        prompt_text = "\n".join(message.content for message in llm.messages)
        assert expected_reference_markers[template] in prompt_text
        assert "<style>" in prompt_text


def test_generate_page_rejects_unknown_template(client):
    headers = auth_headers(client)

    response = client.post("/api/page/generate", headers=headers, json={"style_template": "journal"})

    assert response.status_code == 422


def test_generate_page_requires_authentication(client):
    response = client.post("/api/page/generate", json={"style_template": "technical"})

    assert response.status_code == 401


def test_generate_page_does_not_persist_when_llm_fails(client, db_session, monkeypatch):
    headers = auth_headers(client)
    update_profile(
        client,
        headers,
        certificates=[
            {"name": "AWS Cloud Practitioner", "issuer": "Amazon Web Services", "date": date(2025, 8, 1).isoformat()}
        ],
    )
    llm = StubLLMClient(error=RuntimeError("provider unavailable"))
    monkeypatch.setattr(page_api, "build_llm_client", lambda settings: llm, raising=False)

    response = client.post("/api/page/generate", headers=headers, json={"style_template": "technical"})

    assert response.status_code == 502
    assert response.json()["detail"] == "Page generation failed"
    assert db_session.query(GeneratedPage).count() == 0


def test_generate_page_does_not_persist_non_html_provider_output(client, db_session, monkeypatch):
    headers = auth_headers(client)
    update_profile(client, headers)
    llm = StubLLMClient("I noted that. Tell me one concrete impact.")
    monkeypatch.setattr(page_api, "build_llm_client", lambda settings: llm, raising=False)

    response = client.post("/api/page/generate", headers=headers, json={"style_template": "technical"})

    assert response.status_code == 502
    assert response.json()["detail"] == "Page generation failed"
    assert db_session.query(GeneratedPage).count() == 0


def test_generate_page_does_not_persist_prose_wrapped_html(client, db_session, monkeypatch):
    headers = auth_headers(client)
    update_profile(client, headers)
    llm = StubLLMClient("Here is the page:\n<html><body>Maya Chen</body></html>")
    monkeypatch.setattr(page_api, "build_llm_client", lambda settings: llm, raising=False)

    response = client.post("/api/page/generate", headers=headers, json={"style_template": "technical"})

    assert response.status_code == 502
    assert response.json()["detail"] == "Page generation failed"
    assert db_session.query(GeneratedPage).count() == 0


def test_generate_page_does_not_persist_markdown_fenced_html(client, db_session, monkeypatch):
    headers = auth_headers(client)
    update_profile(client, headers)
    llm = StubLLMClient("```html\n<html><body>Maya Chen</body></html>\n```")
    monkeypatch.setattr(page_api, "build_llm_client", lambda settings: llm, raising=False)

    response = client.post("/api/page/generate", headers=headers, json={"style_template": "technical"})

    assert response.status_code == 502
    assert response.json()["detail"] == "Page generation failed"
    assert db_session.query(GeneratedPage).count() == 0


def test_generate_page_retries_when_version_was_taken_during_generation(client, db_session, monkeypatch):
    headers = auth_headers(client)
    update_profile(client, headers)
    owner = db_session.query(User).filter_by(email="generate.owner@example.com").one()
    db_session.add(GeneratedPage(user_id=owner.id, html_content="<html>v1</html>", style_template="technical", version=1))
    db_session.commit()
    llm = StubLLMClient("<!doctype html><html><body>Maya Chen v2</body></html>")
    versions = iter([1, 2])
    monkeypatch.setattr(page_api, "build_llm_client", lambda settings: llm, raising=False)
    monkeypatch.setattr(page_api, "_next_page_version", lambda db, current_user: next(versions))

    response = client.post("/api/page/generate", headers=headers, json={"style_template": "technical"})

    assert response.status_code == 200
    assert response.json()["version"] == 2
    assert db_session.query(GeneratedPage).filter_by(user_id=owner.id).count() == 2


def test_generate_page_returns_conflict_when_version_retry_is_exhausted(client, db_session, monkeypatch):
    headers = auth_headers(client)
    update_profile(client, headers)
    owner = db_session.query(User).filter_by(email="generate.owner@example.com").one()
    db_session.add(GeneratedPage(user_id=owner.id, html_content="<html>v1</html>", style_template="technical", version=1))
    db_session.commit()
    llm = StubLLMClient("<!doctype html><html><body>Maya Chen v2</body></html>")
    monkeypatch.setattr(page_api, "build_llm_client", lambda settings: llm, raising=False)
    monkeypatch.setattr(page_api, "_next_page_version", lambda db, current_user: 1)

    response = client.post("/api/page/generate", headers=headers, json={"style_template": "technical"})

    assert response.status_code == 409
    assert response.json()["detail"] == "Could not allocate generated page version"
    assert db_session.query(GeneratedPage).filter_by(user_id=owner.id).count() == 1
