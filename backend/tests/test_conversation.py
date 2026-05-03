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


def test_message_appends_user_message_and_placeholder_reply(client):
    headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=headers, json={"context_type": "career"}).json()

    response = client.post(
        "/api/conversation/message",
        headers=headers,
        json={"conversation_id": conversation["id"], "content": "I built a course scheduler."},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["assistant_message"]["role"] == "assistant"
    assert body["assistant_message"]["content"] == "I noted that. CareerPal's AI response will be enabled in a later milestone."
    assert body["messages"][-2]["content"] == "I built a course scheduler."
    assert body["messages"][-1] == body["assistant_message"]


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
