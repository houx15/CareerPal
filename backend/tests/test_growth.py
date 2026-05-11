import json

from app.models.growth import GrowthPlan, GrowthProgressLog
from app.models.user import User
from tests.test_page import auth_headers, create_user


class CapturingGrowthLLMClient:
    def __init__(self, chunks: list[str]):
        self.chunks = chunks
        self.messages = None

    async def stream_chat(self, messages):
        self.messages = list(messages)
        for chunk in self.chunks:
            yield chunk


def growth_payload(goal: str = "Become a platform engineer"):
    return {
        "goal": goal,
        "nodes": [
            {"id": "root", "label": "Start", "state": "done", "quality": 1.0, "parent": None, "x": 0, "y": 0},
            {
                "id": "systems",
                "label": "Distributed systems",
                "state": "active",
                "quality": 0.45,
                "parent": "root",
                "x": -180,
                "y": 140,
            },
            {
                "id": "sql",
                "label": "SQL evidence",
                "state": "locked",
                "quality": 0.0,
                "parent": "systems",
                "x": -260,
                "y": 280,
            },
        ],
    }


def test_growth_plan_requires_authentication(client):
    assert client.get("/api/growth/plan").status_code == 401
    assert client.put("/api/growth/plan", json=growth_payload()).status_code == 401


def test_growth_plan_upsert_and_get_current_user_plan(client, db_session):
    headers = auth_headers(client, email="growth.owner@example.com", username="growthowner")

    created = client.put("/api/growth/plan", headers=headers, json=growth_payload())

    assert created.status_code == 200
    body = created.json()
    assert body["id"]
    assert body["goal"] == "Become a platform engineer"
    assert body["nodes"][1]["id"] == "systems"
    assert body["nodes"][1]["state"] == "active"
    assert body["nodes"][1]["quality"] == 0.45

    owner = db_session.query(User).filter_by(email="growth.owner@example.com").one()
    stored = db_session.query(GrowthPlan).filter_by(user_id=owner.id).one()
    assert stored.goal == "Become a platform engineer"
    assert stored.nodes[2]["parent"] == "systems"

    loaded = client.get("/api/growth/plan", headers=headers)

    assert loaded.status_code == 200
    assert loaded.json()["id"] == body["id"]
    assert loaded.json()["nodes"] == growth_payload()["nodes"]


def test_growth_plan_update_replaces_existing_user_plan(client):
    headers = auth_headers(client, email="growth.update@example.com", username="growthupdate")
    first = client.put("/api/growth/plan", headers=headers, json=growth_payload("First goal")).json()

    response = client.put(
        "/api/growth/plan",
        headers=headers,
        json={
            "goal": "Second goal",
            "nodes": [
                {"id": "root", "label": "Start", "state": "done", "quality": 1.0, "parent": None, "x": 0, "y": 0}
            ],
        },
    )

    assert response.status_code == 200
    assert response.json()["id"] == first["id"]
    assert response.json()["goal"] == "Second goal"
    assert len(response.json()["nodes"]) == 1


def test_growth_plan_is_current_user_only(client, db_session):
    owner_headers = auth_headers(client, email="growth.only@example.com", username="growthonly")
    other_headers = auth_headers(client, email="growth.other@example.com", username="growthother")
    client.put("/api/growth/plan", headers=owner_headers, json=growth_payload("Owner goal"))
    other = create_user(db_session, "other.seed@example.com", "otherseed")
    db_session.add(GrowthPlan(user_id=other.id, goal="Other seeded goal", nodes=growth_payload("Other")["nodes"]))
    db_session.commit()

    response = client.get("/api/growth/plan", headers=other_headers)

    assert response.status_code == 404
    assert response.json()["detail"] == "Growth plan not found"


def test_growth_plan_rejects_invalid_nodes(client):
    headers = auth_headers(client, email="growth.invalid@example.com", username="growthinvalid")
    payload = growth_payload()
    payload["nodes"][0]["state"] = "maybe"

    response = client.put("/api/growth/plan", headers=headers, json=payload)

    assert response.status_code == 422


def test_growth_plan_rejects_duplicate_node_ids(client):
    headers = auth_headers(client, email="growth.duplicate@example.com", username="growthduplicate")
    payload = growth_payload()
    payload["nodes"][1]["id"] = "root"

    response = client.put("/api/growth/plan", headers=headers, json=payload)

    assert response.status_code == 422
    assert "duplicate" in str(response.json()["detail"]).lower()


def test_growth_plan_rejects_missing_parent_reference(client):
    headers = auth_headers(client, email="growth.missingparent@example.com", username="growthmissingparent")
    payload = growth_payload()
    payload["nodes"][1]["parent"] = "missing"

    response = client.put("/api/growth/plan", headers=headers, json=payload)

    assert response.status_code == 422
    assert "parent" in str(response.json()["detail"]).lower()


def test_growth_plan_rejects_self_parenting_nodes(client):
    headers = auth_headers(client, email="growth.selfparent@example.com", username="growthselfparent")
    payload = growth_payload()
    payload["nodes"][1]["parent"] = "systems"

    response = client.put("/api/growth/plan", headers=headers, json=payload)

    assert response.status_code == 422
    assert "parent" in str(response.json()["detail"]).lower()


def test_growth_plan_rejects_parent_cycles(client):
    headers = auth_headers(client, email="growth.cycle@example.com", username="growthcycle")
    payload = growth_payload()
    payload["nodes"][0]["parent"] = "sql"

    response = client.put("/api/growth/plan", headers=headers, json=payload)

    assert response.status_code == 422
    assert "cycle" in str(response.json()["detail"]).lower()


def test_generate_growth_plan_requires_authentication(client):
    response = client.post("/api/growth/plan/generate", json={"match_analysis_id": "match-1"})

    assert response.status_code == 401


def test_generate_growth_plan_from_match_persists_fake_llm_tree(client, monkeypatch):
    headers = auth_headers(client, email="growth.generate@example.com", username="growthgenerate")
    match = client.post(
        "/api/match/analyze",
        headers=headers,
        json={"job_description": "Company: Stripe\nRole: Backend Intern\nPython, SQL, and distributed systems."},
    ).json()
    provider_payload = {
        "goal": "Close Backend Intern gaps",
        "nodes": [
            {"id": "root", "label": "Backend Intern readiness", "state": "done", "quality": 1, "parent": None, "x": 0, "y": 0},
            {"id": "sql", "label": "SQL reliability evidence", "state": "active", "quality": 0.25, "parent": "root", "x": -160, "y": 140},
            {
                "id": "systems",
                "label": "Distributed systems project",
                "state": "locked",
                "quality": 0,
                "parent": "sql",
                "x": -260,
                "y": 280,
            },
        ],
    }
    fake_client = CapturingGrowthLLMClient([json.dumps(provider_payload)])

    from app.api import growth as growth_api

    monkeypatch.setattr(growth_api, "build_llm_client", lambda settings: fake_client)

    response = client.post("/api/growth/plan/generate", headers=headers, json={"match_analysis_id": match["id"]})

    assert response.status_code == 201
    body = response.json()
    assert body["goal"] == "Close Backend Intern gaps"
    assert body["nodes"][1]["id"] == "sql"
    assert body["nodes"][1]["state"] == "active"

    loaded = client.get("/api/growth/plan", headers=headers)
    assert loaded.status_code == 200
    assert loaded.json()["id"] == body["id"]
    assert loaded.json()["nodes"] == provider_payload["nodes"]

    assert fake_client.messages is not None
    prompt = "\n".join(message.content for message in fake_client.messages)
    assert "CareerPal's growth roadmap strategist" in prompt
    assert "SQL" in prompt
    assert "Backend Intern" in prompt
    assert "Return only JSON" in prompt


def test_generate_growth_plan_default_fake_provider_uses_match_role(client):
    headers = auth_headers(client, email="growth.defaultfake@example.com", username="growthdefaultfake")
    match = client.post(
        "/api/match/analyze",
        headers=headers,
        json={"job_description": "Company: Stripe\nRole: Backend Intern\nPython, SQL, and distributed systems."},
    ).json()

    response = client.post("/api/growth/plan/generate", headers=headers, json={"match_analysis_id": match["id"]})

    assert response.status_code == 201
    body = response.json()
    assert body["goal"] == "Close Backend Intern gaps"
    assert body["nodes"][0]["label"] == "Backend Intern readiness"
    assert any(node["label"] == "Build SQL evidence" for node in body["nodes"])


def test_generate_growth_plan_rejects_other_users_match(client):
    owner_headers = auth_headers(client, email="growth.genowner@example.com", username="growthgenowner")
    other_headers = auth_headers(client, email="growth.genother@example.com", username="growthgenother")
    match = client.post(
        "/api/match/analyze",
        headers=owner_headers,
        json={"job_description": "Backend Intern at Stripe\nPython and SQL role."},
    ).json()

    response = client.post("/api/growth/plan/generate", headers=other_headers, json={"match_analysis_id": match["id"]})

    assert response.status_code == 404
    assert response.json()["detail"] == "Match analysis not found"


def test_generate_growth_plan_rejects_malformed_llm_output_without_replacing_existing_plan(client, monkeypatch):
    headers = auth_headers(client, email="growth.badllm@example.com", username="growthbadllm")
    match = client.post(
        "/api/match/analyze",
        headers=headers,
        json={"job_description": "Frontend Engineer at Vercel\nReact and TypeScript role."},
    ).json()
    existing = client.put("/api/growth/plan", headers=headers, json=growth_payload("Existing plan")).json()
    fake_client = CapturingGrowthLLMClient(["not json"])

    from app.api import growth as growth_api

    monkeypatch.setattr(growth_api, "build_llm_client", lambda settings: fake_client)

    response = client.post("/api/growth/plan/generate", headers=headers, json={"match_analysis_id": match["id"]})

    assert response.status_code == 502
    assert response.json()["detail"] == "LLM provider returned invalid growth roadmap"
    loaded = client.get("/api/growth/plan", headers=headers)
    assert loaded.json()["id"] == existing["id"]
    assert loaded.json()["goal"] == "Existing plan"


def test_growth_progress_requires_authentication(client):
    response = client.post(
        "/api/growth/plan/nodes/systems/progress",
        json={"evidence": "Published a systems design write-up with tradeoffs."},
    )

    assert response.status_code == 401


def test_log_growth_progress_updates_node_quality_state_and_persists_log(client, db_session):
    headers = auth_headers(client, email="growth.progress@example.com", username="growthprogress")
    client.put("/api/growth/plan", headers=headers, json=growth_payload())

    response = client.post(
        "/api/growth/plan/nodes/systems/progress",
        headers=headers,
        json={"evidence": "Published a distributed systems write-up with consistency tradeoffs."},
    )

    assert response.status_code == 201
    body = response.json()
    updated = next(node for node in body["plan"]["nodes"] if node["id"] == "systems")
    assert updated["quality"] == 0.57
    assert updated["state"] == "active"
    assert body["log"]["node_id"] == "systems"
    assert body["log"]["node_label"] == "Distributed systems"
    assert body["log"]["evidence"] == "Published a distributed systems write-up with consistency tradeoffs."

    owner = db_session.query(User).filter_by(email="growth.progress@example.com").one()
    log = db_session.query(GrowthProgressLog).filter_by(user_id=owner.id, node_id="systems").one()
    assert log.evidence == "Published a distributed systems write-up with consistency tradeoffs."
    assert log.quality_delta == 0.12

    loaded = client.get("/api/growth/plan", headers=headers).json()
    reloaded_node = next(node for node in loaded["nodes"] if node["id"] == "systems")
    assert reloaded_node["quality"] == 0.57
    assert loaded["progress_logs"][0]["node_id"] == "systems"


def test_log_growth_progress_marks_node_done_at_quality_threshold(client):
    headers = auth_headers(client, email="growth.done@example.com", username="growthdone")
    payload = growth_payload()
    payload["nodes"][1]["quality"] = 0.9
    client.put("/api/growth/plan", headers=headers, json=payload)

    response = client.post(
        "/api/growth/plan/nodes/systems/progress",
        headers=headers,
        json={"evidence": "Shipped the capstone project and documented production lessons."},
    )

    assert response.status_code == 201
    updated = next(node for node in response.json()["plan"]["nodes"] if node["id"] == "systems")
    assert updated["quality"] == 1
    assert updated["state"] == "done"


def test_log_growth_progress_rejects_locked_nodes(client, db_session):
    headers = auth_headers(client, email="growth.locked@example.com", username="growthlocked")
    client.put("/api/growth/plan", headers=headers, json=growth_payload())

    response = client.post(
        "/api/growth/plan/nodes/sql/progress",
        headers=headers,
        json={"evidence": "Tried to bypass the locked roadmap step."},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Growth node is locked"
    loaded = client.get("/api/growth/plan", headers=headers).json()
    locked = next(node for node in loaded["nodes"] if node["id"] == "sql")
    assert locked["state"] == "locked"
    assert locked["quality"] == 0

    owner = db_session.query(User).filter_by(email="growth.locked@example.com").one()
    assert db_session.query(GrowthProgressLog).filter_by(user_id=owner.id, node_id="sql").count() == 0


def test_log_growth_progress_appends_profile_comment_note(client):
    headers = auth_headers(client, email="growth.profile@example.com", username="growthprofile")
    client.patch("/api/profile", headers=headers, json={"comment": "Existing summary note."})
    client.put("/api/growth/plan", headers=headers, json=growth_payload())

    response = client.post(
        "/api/growth/plan/nodes/systems/progress",
        headers=headers,
        json={"evidence": "Added a benchmark section comparing queue backpressure strategies."},
    )

    assert response.status_code == 201
    profile = client.get("/api/profile", headers=headers).json()
    assert "Existing summary note." in profile["comment"]
    assert "Growth evidence - Distributed systems" in profile["comment"]
    assert "queue backpressure" in profile["comment"]


def test_log_growth_progress_keeps_profile_note_concise_while_preserving_full_log(client, db_session):
    headers = auth_headers(client, email="growth.concise@example.com", username="growthconcise")
    client.put("/api/growth/plan", headers=headers, json=growth_payload())
    long_evidence = ("Shipped " + "detailed benchmark evidence " * 120).strip()

    response = client.post(
        "/api/growth/plan/nodes/systems/progress",
        headers=headers,
        json={"evidence": long_evidence},
    )

    assert response.status_code == 201
    owner = db_session.query(User).filter_by(email="growth.concise@example.com").one()
    log = db_session.query(GrowthProgressLog).filter_by(user_id=owner.id, node_id="systems").one()
    assert log.evidence == long_evidence

    profile = client.get("/api/profile", headers=headers).json()
    assert len(profile["comment"]) < 260
    assert "Growth evidence - Distributed systems" in profile["comment"]


def test_growth_plan_replacement_clears_progress_logs_for_previous_nodes(client, db_session):
    headers = auth_headers(client, email="growth.replacelogs@example.com", username="growthreplacelogs")
    client.put("/api/growth/plan", headers=headers, json=growth_payload())
    client.post(
        "/api/growth/plan/nodes/systems/progress",
        headers=headers,
        json={"evidence": "Published a distributed systems write-up."},
    )

    response = client.put(
        "/api/growth/plan",
        headers=headers,
        json={
            "goal": "New roadmap",
            "nodes": [
                {"id": "root", "label": "Start again", "state": "active", "quality": 0.1, "parent": None, "x": 0, "y": 0}
            ],
        },
    )

    assert response.status_code == 200
    assert response.json()["progress_logs"] == []
    loaded = client.get("/api/growth/plan", headers=headers).json()
    assert loaded["progress_logs"] == []

    owner = db_session.query(User).filter_by(email="growth.replacelogs@example.com").one()
    assert db_session.query(GrowthProgressLog).filter_by(user_id=owner.id).count() == 0


def test_log_growth_progress_rejects_missing_plan(client):
    headers = auth_headers(client, email="growth.missingplan@example.com", username="growthmissingplan")

    response = client.post(
        "/api/growth/plan/nodes/systems/progress",
        headers=headers,
        json={"evidence": "Documented a new project result."},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Growth plan not found"


def test_log_growth_progress_rejects_unknown_node(client):
    headers = auth_headers(client, email="growth.unknownnode@example.com", username="growthunknownnode")
    client.put("/api/growth/plan", headers=headers, json=growth_payload())

    response = client.post(
        "/api/growth/plan/nodes/unknown/progress",
        headers=headers,
        json={"evidence": "Documented a new project result."},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Growth node not found"
