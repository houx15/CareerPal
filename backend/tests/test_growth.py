from app.models.growth import GrowthPlan
from app.models.user import User
from tests.test_page import auth_headers, create_user


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
