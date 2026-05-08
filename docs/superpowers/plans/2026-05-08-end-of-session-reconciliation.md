# End-Of-Session Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic conversation reconciliation job that reviews a career conversation history, applies explicit profile corrections, and reports a stable diff.

**Architecture:** Reconciliation lives in the extraction service beside light extraction, because Slice 2.6 extends the same profile-update pipeline from per-message extraction to full conversation review. A new authenticated conversation endpoint triggers reconciliation for one owned career conversation and returns the applied diff. The first slice is deterministic and scalar-profile focused so behavior is testable without third-party secrets; later LLM-backed reconciliation can replace the extractor behind the same service boundary.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest, existing `Profile` and `Conversation` models.

---

## File Structure

- Modify `backend/app/services/extraction.py`
  - Add `reconcile_conversation_profile(db, conversation)` that scans chronological user messages, applies explicit profile updates in order, and returns the same diff shape as light extraction.
  - Reuse `extract_explicit_profile_updates()` and `_apply_profile_updates()` so conflict behavior stays consistent.
- Modify `backend/app/api/conversation.py`
  - Add `POST /api/conversation/{conversation_id}/reconcile`.
  - Require ownership and reject non-career conversations with HTTP 422.
  - Commit profile changes and return a typed response.
- Modify `backend/app/schemas/conversation.py`
  - Add `ConversationReconcileResponse` with `conversation_id` and optional `extraction_diff`.
- Modify `backend/tests/test_conversation.py`
  - Add red/green API tests for later correction behavior, idempotence, context gating, and ownership.

---

### Task 1: Reconciliation Service

**Files:**
- Modify: `backend/app/services/extraction.py`
- Test: `backend/tests/test_conversation.py`

- [ ] **Step 1: Write failing tests for end-of-session correction and idempotence**

Add tests to `backend/tests/test_conversation.py`:

```python
def test_reconcile_career_conversation_applies_later_explicit_corrections(client):
    headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=headers, json={"context_type": "career"}).json()
    client.post(
        "/api/conversation/message",
        headers=headers,
        json={"conversation_id": conversation["id"], "content": "My target direction is Data engineering."},
    )
    client.post(
        "/api/conversation/message",
        headers=headers,
        json={"conversation_id": conversation["id"], "content": "Actually, my target direction is Platform engineering."},
    )

    response = client.post(f"/api/conversation/{conversation['id']}/reconcile", headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "conversation_id": conversation["id"],
        "extraction_diff": {
            "profile": {
                "target_direction": {"before": "Data engineering", "after": "Platform engineering"},
            }
        },
    }
    profile = client.get("/api/profile", headers=headers).json()
    assert profile["target_direction"] == "Platform engineering"


def test_reconcile_career_conversation_is_idempotent(client):
    headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=headers, json={"context_type": "career"}).json()
    client.post(
        "/api/conversation/message",
        headers=headers,
        json={"conversation_id": conversation["id"], "content": "My headline is Backend SWE intern."},
    )

    first = client.post(f"/api/conversation/{conversation['id']}/reconcile", headers=headers)
    second = client.post(f"/api/conversation/{conversation['id']}/reconcile", headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json() == {"conversation_id": conversation["id"]}
    profile = client.get("/api/profile", headers=headers).json()
    assert profile["headline"] == "Backend SWE intern"
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd backend && python3 -m pytest tests/test_conversation.py::test_reconcile_career_conversation_applies_later_explicit_corrections tests/test_conversation.py::test_reconcile_career_conversation_is_idempotent -q
```

Expected: both fail with HTTP 404 because the reconcile endpoint does not exist.

- [ ] **Step 3: Add minimal reconciliation service**

In `backend/app/services/extraction.py`, add:

```python
from app.models.conversation import Conversation
```

Then add:

```python
def reconcile_conversation_profile(db: Session, conversation: Conversation) -> dict | None:
    updates: dict[str, str] = {}
    for message in conversation.messages or []:
        if message.get("role") != "user":
            continue
        content = message.get("content")
        if not content:
            continue
        updates.update(extract_explicit_profile_updates(content))

    if not updates:
        return None

    user = db.scalar(select(User).where(User.id == conversation.user_id))
    if user is None:
        raise RuntimeError("User disappeared while applying reconciliation")

    profile = user.profile
    if profile is None:
        profile = Profile(user_id=conversation.user_id)
        db.add(profile)
        db.flush()

    changes = _apply_profile_updates(profile, updates)
    if not changes:
        return None

    db.add(profile)
    return {"profile": changes}
```

- [ ] **Step 4: Add typed response and endpoint**

In `backend/app/schemas/conversation.py`, add:

```python
class ConversationReconcileResponse(BaseModel):
    conversation_id: str
    extraction_diff: dict | None = None
```

In `backend/app/api/conversation.py`, import it and `reconcile_conversation_profile`, then add:

```python
@router.post("/{conversation_id}/reconcile", response_model=ConversationReconcileResponse)
def reconcile_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationReconcileResponse:
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if conversation.context_type != "career":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only career conversations can be reconciled")

    extraction_diff = reconcile_conversation_profile(db, conversation)
    if extraction_diff:
        db.commit()

    return ConversationReconcileResponse(conversation_id=conversation.id, extraction_diff=extraction_diff)
```

- [ ] **Step 5: Run tests to verify green**

Run:

```bash
cd backend && python3 -m pytest tests/test_conversation.py::test_reconcile_career_conversation_applies_later_explicit_corrections tests/test_conversation.py::test_reconcile_career_conversation_is_idempotent -q
```

Expected: both pass.

---

### Task 2: Reconciliation Guards And Regression Coverage

**Files:**
- Modify: `backend/tests/test_conversation.py`
- Modify: `backend/app/api/conversation.py`

- [ ] **Step 1: Write failing tests for guard behavior**

Add tests to `backend/tests/test_conversation.py`:

```python
def test_reconcile_rejects_page_conversations(client):
    headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=headers, json={"context_type": "page"}).json()

    response = client.post(f"/api/conversation/{conversation['id']}/reconcile", headers=headers)

    assert response.status_code == 422
    assert response.json()["detail"] == "Only career conversations can be reconciled"


def test_reconcile_rejects_conversation_owned_by_another_user(client):
    owner_headers = auth_headers(client)
    conversation = client.post("/api/conversation/start", headers=owner_headers, json={"context_type": "career"}).json()
    other_user = client.post(
        "/api/auth/register",
        json={"email": "jamie@example.com", "username": "jamie", "password": "secret123"},
    ).json()

    response = client.post(
        f"/api/conversation/{conversation['id']}/reconcile",
        headers={"Authorization": f"Bearer {other_user['access_token']}"},
    )

    assert response.status_code == 404
```

- [ ] **Step 2: Run tests to verify behavior**

Run:

```bash
cd backend && python3 -m pytest tests/test_conversation.py::test_reconcile_rejects_page_conversations tests/test_conversation.py::test_reconcile_rejects_conversation_owned_by_another_user -q
```

Expected: both pass if Task 1 endpoint included the guards. If either fails, add the missing guard before continuing.

- [ ] **Step 3: Run the full conversation test module**

Run:

```bash
cd backend && python3 -m pytest tests/test_conversation.py -q
```

Expected: all conversation tests pass.

---

### Task 3: Review And Full Verification

**Files:**
- Review: `backend/app/services/extraction.py`
- Review: `backend/app/api/conversation.py`
- Review: `backend/app/schemas/conversation.py`
- Review: `backend/tests/test_conversation.py`

- [ ] **Step 1: Dispatch spec compliance reviewer**

Ask the reviewer to check Slice 2.6 against:

- `docs/SPEC.md` section 7.4
- `docs/superpowers/plans/2026-05-07-careerpal-master-roadmap.md` Slice 2.6
- `docs/superpowers/plans/2026-05-08-end-of-session-reconciliation.md`

Expected: reviewer confirms later explicit corrections overwrite earlier data, reconciliation is idempotent, page conversations do not reconcile, and no third-party secrets are required.

- [ ] **Step 2: Dispatch code quality reviewer**

Ask the reviewer to check for transaction safety, accidental inference, endpoint authorization, type consistency, and test quality.

Expected: reviewer reports no blockers or provides concrete fixes with file/line references.

- [ ] **Step 3: Run full verification gate**

Run:

```bash
cd backend && python3 -m pytest
cd frontend && npm test -- --run
cd frontend && npx tsc --noEmit
cd frontend && npm run build
cd /home/yuxin/CareerPal && git diff --check
rm -f /home/yuxin/CareerPal/frontend/tsconfig.tsbuildinfo
cd /home/yuxin/CareerPal && git status -sb
```

Expected:

- Backend tests pass.
- Frontend tests pass.
- TypeScript check passes.
- Production build passes.
- `git diff --check` prints no whitespace errors.
- Only intended Slice 2.6 files are modified.

- [ ] **Step 4: Commit and push**

Run:

```bash
git add backend/app/services/extraction.py backend/app/api/conversation.py backend/app/schemas/conversation.py backend/tests/test_conversation.py docs/superpowers/plans/2026-05-08-end-of-session-reconciliation.md
git commit -m "feat: reconcile career conversations"
git push
```

Expected: commit is pushed to `origin/main`.

---

## Self-Review

- Spec coverage: Implements the Slice 2.6 backend job/service and explicit correction/idempotence acceptance criteria. The idle-threshold scheduler is intentionally deferred because the current app has no background worker or leave/pause event contract yet.
- Placeholder scan: No `TBD`, `TODO`, or undefined task references.
- Type consistency: Uses `ConversationReconcileResponse`, `reconcile_conversation_profile`, and the existing `extraction_diff` shape consistently across endpoint, service, and tests.
