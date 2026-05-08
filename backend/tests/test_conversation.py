import json

import httpx

from app.api import conversation as conversation_api
from app.services.llm import LLMProviderError


def parse_sse_events(response):
    events = []
    for block in response.text.strip().split("\n\n"):
        event = {}
        data_lines = []
        for line in block.splitlines():
            if line.startswith("event: "):
                event["event"] = line.removeprefix("event: ")
            elif line.startswith("data: "):
                data_lines.append(line.removeprefix("data: "))
        if event:
            raw_data = "\n".join(data_lines)
            event["data"] = json.loads(raw_data) if raw_data else None
            events.append(event)
    return events


def auth_headers(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "alex@example.com", "username": "alexchen", "password": "secret123"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_start_conversation_persists_context(client):
    response = client.post(
        "/api/conversation/start",
        headers=auth_headers(client),
        json={"context_type": "career", "focus_node": "experience"},
    )

    assert response.status_code == 201
    assert response.json()["context_type"] == "career"
    assert response.json()["focus_node"] == "experience"
    assert response.json()["messages"] == []
    assert response.json()["created_at"]
    assert response.json()["updated_at"]


def test_start_conversation_rejects_unknown_context_type(client):
    response = client.post(
        "/api/conversation/start",
        headers=auth_headers(client),
        json={"context_type": "resume", "focus_node": "experience"},
    )

    assert response.status_code == 422


def test_message_streams_delta_done_payload_and_persists_messages(client):
    headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=headers, json={"context_type": "career"}).json()

    response = client.post(
        "/api/conversation/message",
        headers=headers,
        json={"conversation_id": conversation["id"], "content": "I built a course scheduler."},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")

    events = parse_sse_events(response)
    message_events = [event for event in events if event["event"] == "message"]
    done_events = [event for event in events if event["event"] == "done"]
    assert message_events
    assert message_events[0]["data"] == {"delta": "I noted that. "}
    assert len(done_events) == 1

    body = done_events[0]["data"]
    assert body["conversation_id"] == conversation["id"]
    assert body["assistant_message"]["role"] == "assistant"
    assert (
        body["assistant_message"]["content"]
        == "I noted that. Tell me one concrete impact or result from that experience."
    )
    assert body["messages"][-2]["content"] == "I built a course scheduler."
    assert body["messages"][-2]["timestamp"]
    assert body["messages"][-1]["timestamp"]
    assert body["messages"][-1] == body["assistant_message"]

    persisted = client.get(f"/api/conversation/{conversation['id']}", headers=headers).json()
    assert persisted["messages"] == body["messages"]


def test_career_message_extracts_explicit_profile_updates_and_returns_diff(client):
    headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=headers, json={"context_type": "career"}).json()

    response = client.post(
        "/api/conversation/message",
        headers=headers,
        json={
            "conversation_id": conversation["id"],
            "content": (
                "My headline is Backend SWE intern. "
                "My target direction is Platform engineering. "
                "My location is Austin, TX."
            ),
        },
    )

    assert response.status_code == 200
    done = [event for event in parse_sse_events(response) if event["event"] == "done"][0]["data"]
    assert done["extraction_diff"] == {
        "profile": {
            "headline": {"before": None, "after": "Backend SWE intern"},
            "target_direction": {"before": None, "after": "Platform engineering"},
            "location": {"before": None, "after": "Austin, TX"},
        }
    }

    profile = client.get("/api/profile", headers=headers).json()
    assert profile["headline"] == "Backend SWE intern"
    assert profile["target_direction"] == "Platform engineering"
    assert profile["location"] == "Austin, TX"


def test_career_extraction_leaves_unstated_profile_fields_unchanged(client):
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "headline": "Original headline",
            "target_direction": "Data engineering",
            "location": "Boston, MA",
            "phone": "555-0100",
            "contact_email": "alex.public@example.com",
            "comment": "Interested in reliable systems.",
        },
    )
    conversation = client.post("/api/conversation/start", headers=headers, json={"context_type": "career"}).json()

    response = client.post(
        "/api/conversation/message",
        headers=headers,
        json={"conversation_id": conversation["id"], "content": "My headline is Backend SWE intern."},
    )

    assert response.status_code == 200
    done = [event for event in parse_sse_events(response) if event["event"] == "done"][0]["data"]
    assert done["extraction_diff"] == {
        "profile": {
            "headline": {"before": "Original headline", "after": "Backend SWE intern"},
        }
    }

    profile = client.get("/api/profile", headers=headers).json()
    assert profile["headline"] == "Backend SWE intern"
    assert profile["target_direction"] == "Data engineering"
    assert profile["location"] == "Boston, MA"
    assert profile["phone"] == "555-0100"
    assert profile["contact_email"] == "alex.public@example.com"
    assert profile["comment"] == "Interested in reliable systems."


def test_career_extraction_bounds_scalar_values_and_ignores_non_update_mentions(client):
    headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=headers, json={"context_type": "career"}).json()

    response = client.post(
        "/api/conversation/message",
        headers=headers,
        json={
            "conversation_id": conversation["id"],
            "content": (
                "My headline is Backend SWE intern. "
                "I like infrastructure. "
                "Location is less important than remote fit. "
                "My phone is off during class. "
                "123 students attended the demo."
            ),
        },
    )

    assert response.status_code == 200
    done = [event for event in parse_sse_events(response) if event["event"] == "done"][0]["data"]
    assert done["extraction_diff"] == {
        "profile": {
            "headline": {"before": None, "after": "Backend SWE intern"},
        }
    }

    profile = client.get("/api/profile", headers=headers).json()
    assert profile["headline"] == "Backend SWE intern"
    assert profile["location"] is None
    assert profile["phone"] is None


def test_career_message_extracts_straightforward_contact_and_comment_fields(client):
    headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=headers, json={"context_type": "career"}).json()

    response = client.post(
        "/api/conversation/message",
        headers=headers,
        json={
            "conversation_id": conversation["id"],
            "content": (
                "My contact email is alex.public@example.com. "
                "My phone number is 555-0100. "
                "My summary is I like building reliable internal tools."
            ),
        },
    )

    assert response.status_code == 200
    done = [event for event in parse_sse_events(response) if event["event"] == "done"][0]["data"]
    assert done["extraction_diff"] == {
        "profile": {
            "contact_email": {"before": None, "after": "alex.public@example.com"},
            "phone": {"before": None, "after": "555-0100"},
            "comment": {"before": None, "after": "I like building reliable internal tools"},
        }
    }

    profile = client.get("/api/profile", headers=headers).json()
    assert profile["contact_email"] == "alex.public@example.com"
    assert profile["phone"] == "555-0100"
    assert profile["comment"] == "I like building reliable internal tools"


def test_page_message_does_not_extract_profile_updates(client):
    headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=headers, json={"context_type": "page"}).json()

    response = client.post(
        "/api/conversation/message",
        headers=headers,
        json={
            "conversation_id": conversation["id"],
            "content": "My headline is Backend SWE intern. My location is Austin, TX.",
        },
    )

    assert response.status_code == 200
    done = [event for event in parse_sse_events(response) if event["event"] == "done"][0]["data"]
    assert "extraction_diff" not in done

    profile = client.get("/api/profile", headers=headers).json()
    assert profile["headline"] is None
    assert profile["location"] is None


def test_provider_failure_does_not_extract_profile_updates(client, monkeypatch):
    class FailingLLMClient:
        async def stream_chat(self, messages):
            yield "Partial response"
            raise LLMProviderError("LLM provider error: overloaded")

    monkeypatch.setattr(conversation_api, "build_llm_client", lambda settings: FailingLLMClient())
    headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=headers, json={"context_type": "career"}).json()

    response = client.post(
        "/api/conversation/message",
        headers=headers,
        json={
            "conversation_id": conversation["id"],
            "content": "My headline is Backend SWE intern. My location is Austin, TX.",
        },
    )

    assert response.status_code == 200
    assert [event["event"] for event in parse_sse_events(response)] == ["message", "error"]

    profile = client.get("/api/profile", headers=headers).json()
    assert profile["headline"] is None
    assert profile["location"] is None


def test_extraction_failure_does_not_rollback_successful_assistant_message(client, monkeypatch):
    def fail_extraction(db, user_id, user_text):
        raise RuntimeError("extractor failed")

    monkeypatch.setattr(conversation_api, "apply_profile_extraction", fail_extraction)
    headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=headers, json={"context_type": "career"}).json()

    response = client.post(
        "/api/conversation/message",
        headers=headers,
        json={"conversation_id": conversation["id"], "content": "My headline is Backend SWE intern."},
    )

    assert response.status_code == 200
    events = parse_sse_events(response)
    assert [event["event"] for event in events][-1] == "done"
    assert "extraction_diff" not in events[-1]["data"]

    persisted = client.get(f"/api/conversation/{conversation['id']}", headers=headers).json()
    assert persisted["messages"][-2]["content"] == "My headline is Backend SWE intern."
    assert persisted["messages"][-1]["role"] == "assistant"
    assert persisted["messages"][-1]["content"] == "I noted that. Tell me one concrete impact or result from that experience."
    profile = client.get("/api/profile", headers=headers).json()
    assert profile["headline"] is None


def test_message_prompt_includes_current_profile_context(client, monkeypatch):
    captured_messages = []

    class CapturingLLMClient:
        async def stream_chat(self, messages):
            captured_messages.extend(messages)
            yield "Tell me more about the platform impact."

    monkeypatch.setattr(conversation_api, "build_llm_client", lambda settings: CapturingLLMClient())
    headers = auth_headers(client)
    client.patch(
        "/api/profile",
        headers=headers,
        json={
            "name": "Alex Chen",
            "phone": "555-0100",
            "contact_email": "alex.public@example.com",
            "location": "Austin, TX",
            "headline": "Backend SWE intern",
            "target_direction": "Platform engineering",
            "experience": [
                {
                    "company": "Acme Robotics",
                    "role": "Software Engineer Intern",
                    "time": "Summer 2025",
                    "description": "Built an internal deployment dashboard.",
                    "achievements": ["Reduced release checks by 30%"],
                    "comment": "Good systems story",
                }
            ],
            "projects": [
                {
                    "name": "Course Scheduler",
                    "description": "Matched students to course sections.",
                    "tech_stack": ["Python", "PostgreSQL"],
                    "achievements": ["Scheduled 500 students"],
                    "link": "https://example.com/scheduler",
                    "comment": "Useful for backend roles",
                    "completeness": "complete",
                }
            ],
            "skills": [
                {
                    "name": "Python",
                    "category": "Programming",
                    "proficiency": "advanced",
                    "comment": "Used in backend services",
                }
            ],
        },
    )
    conversation = client.post(
        "/api/conversation/start",
        headers=headers,
        json={"context_type": "career", "focus_node": "experience"},
    ).json()

    response = client.post(
        "/api/conversation/message",
        headers=headers,
        json={"conversation_id": conversation["id"], "content": "Can you help refine this internship?"},
    )

    assert response.status_code == 200
    system_message = captured_messages[0]
    assert system_message.role == "system"
    assert "Current conversation focus: experience" in system_message.content
    assert "Alex Chen" in system_message.content
    assert "555-0100" in system_message.content
    assert "alex.public@example.com" in system_message.content
    assert "Austin, TX" in system_message.content
    assert "Backend SWE intern" in system_message.content
    assert "Platform engineering" in system_message.content
    assert "Acme Robotics" in system_message.content
    assert "Reduced release checks by 30%" in system_message.content
    assert "Course Scheduler" in system_message.content
    assert "https://example.com/scheduler" in system_message.content
    assert "complete" in system_message.content
    assert "Python" in system_message.content
    assert "Sections that need more information" in system_message.content
    assert "certificates" in system_message.content


def test_message_streams_error_and_preserves_user_message_when_provider_fails(client, monkeypatch):
    class FailingLLMClient:
        async def stream_chat(self, messages):
            yield "Partial response"
            raise LLMProviderError("LLM provider error: overloaded")

    monkeypatch.setattr(conversation_api, "build_llm_client", lambda settings: FailingLLMClient())
    headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=headers, json={"context_type": "career"}).json()

    response = client.post(
        "/api/conversation/message",
        headers=headers,
        json={"conversation_id": conversation["id"], "content": "I led a launch review."},
    )

    assert response.status_code == 200
    events = parse_sse_events(response)
    assert [event["event"] for event in events] == ["message", "error"]
    assert events[0]["data"] == {"delta": "Partial response"}
    assert events[1]["data"] == {"message": "LLM provider error: overloaded"}

    persisted = client.get(f"/api/conversation/{conversation['id']}", headers=headers).json()
    assert persisted["messages"][-1]["role"] == "user"
    assert persisted["messages"][-1]["content"] == "I led a launch review."


def test_message_streams_error_when_provider_transport_fails(client, monkeypatch):
    class FailingTransportLLMClient:
        async def stream_chat(self, messages):
            raise httpx.ReadTimeout("provider stalled")
            yield ""

    monkeypatch.setattr(conversation_api, "build_llm_client", lambda settings: FailingTransportLLMClient())
    headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=headers, json={"context_type": "career"}).json()

    response = client.post(
        "/api/conversation/message",
        headers=headers,
        json={"conversation_id": conversation["id"], "content": "I improved build times."},
    )

    assert response.status_code == 200
    events = parse_sse_events(response)
    assert events == [{"event": "error", "data": {"message": "LLM provider error: provider stalled"}}]

    persisted = client.get(f"/api/conversation/{conversation['id']}", headers=headers).json()
    assert persisted["messages"][-1]["role"] == "user"
    assert persisted["messages"][-1]["content"] == "I improved build times."


def test_message_requires_authentication(client):
    response = client.post(
        "/api/conversation/message",
        json={"conversation_id": "missing", "content": "Can I write here?"},
    )

    assert response.status_code == 401


def test_message_rejects_conversation_owned_by_another_user(client):
    owner_headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=owner_headers, json={"context_type": "career"}).json()
    other_user = client.post(
        "/api/auth/register",
        json={"email": "jamie@example.com", "username": "jamie", "password": "secret123"},
    ).json()

    response = client.post(
        "/api/conversation/message",
        headers={"Authorization": f"Bearer {other_user['access_token']}"},
        json={"conversation_id": conversation["id"], "content": "Can I write here?"},
    )

    assert response.status_code == 404


def test_history_lists_only_current_users_conversations_newest_first(client):
    headers = auth_headers(client)
    first = client.post(
        "/api/conversation/start",
        headers=headers,
        json={"context_type": "career", "focus_node": "experience"},
    ).json()
    second = client.post(
        "/api/conversation/start",
        headers=headers,
        json={"context_type": "page", "focus_node": "theme"},
    ).json()
    other_user = client.post(
        "/api/auth/register",
        json={"email": "jamie@example.com", "username": "jamie", "password": "secret123"},
    ).json()
    client.post(
        "/api/conversation/start",
        headers={"Authorization": f"Bearer {other_user['access_token']}"},
        json={"context_type": "career", "focus_node": "skills"},
    )

    response = client.get("/api/conversation/history", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert [item["id"] for item in body] == [second["id"], first["id"]]
    assert body[0]["context_type"] == "page"
    assert body[0]["focus_node"] == "theme"
    assert body[0]["created_at"]
    assert body[0]["updated_at"]


def test_get_conversation_returns_full_owned_conversation(client):
    headers = auth_headers(client)
    conversation = client.post(
        "/api/conversation/start",
        headers=headers,
        json={"context_type": "career", "focus_node": "projects"},
    ).json()
    client.post(
        "/api/conversation/message",
        headers=headers,
        json={"conversation_id": conversation["id"], "content": "I launched a portfolio site."},
    )

    response = client.get(f"/api/conversation/{conversation['id']}", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == conversation["id"]
    assert body["context_type"] == "career"
    assert body["focus_node"] == "projects"
    assert body["messages"][0]["role"] == "user"
    assert body["messages"][0]["content"] == "I launched a portfolio site."
    assert body["created_at"]
    assert body["updated_at"]


def test_get_conversation_rejects_conversation_owned_by_another_user(client):
    owner_headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=owner_headers, json={"context_type": "page"}).json()
    other_user = client.post(
        "/api/auth/register",
        json={"email": "jamie@example.com", "username": "jamie", "password": "secret123"},
    ).json()

    response = client.get(
        f"/api/conversation/{conversation['id']}",
        headers={"Authorization": f"Bearer {other_user['access_token']}"},
    )

    assert response.status_code == 404
