import json

from app.api import page as page_api
from app.models.conversation import Conversation
from app.models.page import GeneratedPage
from app.models.user import User
from tests.test_page_generation import StubLLMClient, auth_headers, update_profile


def create_page_conversation(db_session, user_id: str, context_type: str = "page") -> Conversation:
    conversation = Conversation(user_id=user_id, context_type=context_type, messages=[])
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)
    return conversation


def create_generated_page(
    db_session,
    user_id: str,
    version: int = 1,
    html_content: str = "<!doctype html><html><body><h1>Maya Chen</h1></body></html>",
) -> GeneratedPage:
    page = GeneratedPage(
        user_id=user_id,
        html_content=html_content,
        style_template="clean-professional",
        version=version,
    )
    db_session.add(page)
    db_session.commit()
    db_session.refresh(page)
    return page


def current_user(db_session) -> User:
    return db_session.query(User).filter_by(email="generate.owner@example.com").one()


def sse_events(response):
    events = []
    for raw_event in response.text.strip().split("\n\n"):
        event = None
        data = None
        for line in raw_event.splitlines():
            if line.startswith("event:"):
                event = line.removeprefix("event:").strip()
            if line.startswith("data:"):
                data = json.loads(line.removeprefix("data:").strip())
        events.append((event, data))
    return events


def test_customize_page_regenerates_next_version_and_appends_page_conversation(client, db_session, monkeypatch):
    headers = auth_headers(client)
    update_profile(client, headers)
    owner = current_user(db_session)
    conversation = create_page_conversation(db_session, owner.id)
    create_generated_page(db_session, owner.id)
    llm = StubLLMClient("<!doctype html><html><body><h1>Maya Chen</h1><section>Projects first</section></body></html>")
    monkeypatch.setattr(page_api, "build_llm_client", lambda settings: llm, raising=False)

    response = client.post(
        "/api/page/customize",
        headers=headers,
        json={"conversation_id": conversation.id, "instruction": "Make projects more prominent."},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    events = sse_events(response)
    assert "".join(event[1]["delta"] for event in events if event[0] == "message") == (
        "<!doctype html><html><body><h1>Maya Chen</h1><section>Projects first</section></body></html>"
    )
    assert events[-1][0] == "done"
    body = events[-1][1]
    assert body["version"] == 2
    assert body["style_template"] == "clean-professional"
    assert "Projects first" in body["html_content"]
    db_session.expire_all()
    refreshed = db_session.get(Conversation, conversation.id)
    assert refreshed.messages[-2]["role"] == "user"
    assert refreshed.messages[-2]["content"] == "Make projects more prominent."
    assert refreshed.messages[-1]["role"] == "assistant"
    assert refreshed.messages[-1]["content"] == "Updated page version 2."


def test_customize_page_rejects_career_conversation(client, db_session, monkeypatch):
    headers = auth_headers(client)
    update_profile(client, headers)
    owner = current_user(db_session)
    conversation = create_page_conversation(db_session, owner.id, context_type="career")
    create_generated_page(db_session, owner.id)
    llm = StubLLMClient()
    monkeypatch.setattr(page_api, "build_llm_client", lambda settings: llm, raising=False)

    response = client.post(
        "/api/page/customize",
        headers=headers,
        json={"conversation_id": conversation.id, "instruction": "Use a warmer palette."},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Customization requires a page conversation"
    assert db_session.query(GeneratedPage).filter_by(user_id=owner.id).count() == 1


def test_customize_page_requires_existing_generated_page(client, db_session):
    headers = auth_headers(client)
    update_profile(client, headers)
    owner = current_user(db_session)
    conversation = create_page_conversation(db_session, owner.id)

    response = client.post(
        "/api/page/customize",
        headers=headers,
        json={"conversation_id": conversation.id, "instruction": "Make projects more prominent."},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "No generated page found"


def test_customize_page_rejects_blank_instruction(client, db_session):
    headers = auth_headers(client)
    update_profile(client, headers)
    owner = current_user(db_session)
    conversation = create_page_conversation(db_session, owner.id)
    create_generated_page(db_session, owner.id)

    response = client.post(
        "/api/page/customize",
        headers=headers,
        json={"conversation_id": conversation.id, "instruction": "   "},
    )

    assert response.status_code == 422
    assert db_session.query(GeneratedPage).filter_by(user_id=owner.id).count() == 1


def test_customize_page_does_not_persist_when_llm_returns_non_html(client, db_session, monkeypatch):
    headers = auth_headers(client)
    update_profile(client, headers)
    owner = current_user(db_session)
    conversation = create_page_conversation(db_session, owner.id)
    create_generated_page(db_session, owner.id)
    llm = StubLLMClient("Here is the update.")
    monkeypatch.setattr(page_api, "build_llm_client", lambda settings: llm, raising=False)

    response = client.post(
        "/api/page/customize",
        headers=headers,
        json={"conversation_id": conversation.id, "instruction": "Use a warmer palette."},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert sse_events(response)[-1] == ("error", {"message": "Page customization failed"})
    assert db_session.query(GeneratedPage).filter_by(user_id=owner.id).count() == 1
    assert db_session.get(Conversation, conversation.id).messages == []
