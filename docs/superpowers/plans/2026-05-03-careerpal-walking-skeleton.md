# CareerPal Walking Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build separated `frontend/` and `backend/` apps that prove CareerPal's intro -> signup/login -> name -> onboarding -> workspace flow with real auth/profile persistence.

**Architecture:** The backend is a FastAPI app with SQLAlchemy models, Alembic migrations, token auth, and deterministic placeholder conversation contracts. The frontend is a Next.js TypeScript app that preserves the design bundle's stage flow and talks to the backend through a small typed API client.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pytest, Next.js, React, TypeScript, Vitest, Testing Library.

---

## File Structure

Create backend files:

- `backend/pyproject.toml`: Python package metadata and dev dependencies.
- `backend/alembic.ini`: Alembic config.
- `backend/app/__init__.py`: package marker.
- `backend/app/main.py`: FastAPI app factory and router registration.
- `backend/app/core/config.py`: environment settings.
- `backend/app/core/security.py`: password hashing and token helpers.
- `backend/app/db/session.py`: SQLAlchemy engine/session dependency.
- `backend/app/db/base.py`: shared declarative base.
- `backend/app/models/user.py`: `User` and `Profile` models.
- `backend/app/models/conversation.py`: `Conversation` model.
- `backend/app/schemas/auth.py`: auth request/response schemas.
- `backend/app/schemas/profile.py`: profile schemas and completeness schema.
- `backend/app/schemas/conversation.py`: conversation schemas.
- `backend/app/api/auth.py`: auth routes.
- `backend/app/api/profile.py`: profile routes.
- `backend/app/api/conversation.py`: conversation routes.
- `backend/app/api/health.py`: health route.
- `backend/alembic/env.py`: migration runtime.
- `backend/alembic/versions/0001_initial.py`: initial schema migration.
- `backend/tests/conftest.py`: test app and database fixtures.
- `backend/tests/test_health.py`: backend boot test.
- `backend/tests/test_auth.py`: auth behavior tests.
- `backend/tests/test_profile.py`: profile behavior tests.
- `backend/tests/test_conversation.py`: conversation behavior tests.

Create frontend files:

- `frontend/package.json`: scripts and dependencies.
- `frontend/next.config.ts`: Next.js config.
- `frontend/tsconfig.json`: TypeScript config.
- `frontend/vitest.config.ts`: Vitest config.
- `frontend/src/app/page.tsx`: root app shell.
- `frontend/src/app/globals.css`: design tokens and layout CSS adapted from design bundle.
- `frontend/src/lib/api.ts`: typed backend client.
- `frontend/src/lib/types.ts`: shared frontend types.
- `frontend/src/components/IntroScreen.tsx`: intro stage.
- `frontend/src/components/AuthScreens.tsx`: signup/login/name stages.
- `frontend/src/components/OnboardingScreen.tsx`: initial conversation stage.
- `frontend/src/components/Workspace.tsx`: workspace shell.
- `frontend/src/components/StageApp.tsx`: stage state machine.
- `frontend/src/test/setup.ts`: Testing Library setup.
- `frontend/src/lib/api.test.ts`: API client tests.
- `frontend/src/components/StageApp.test.tsx`: flow tests.
- `frontend/src/components/Workspace.test.tsx`: workspace data rendering tests.

Modify existing files:

- `.gitignore`: ignore Python, Node, coverage, and local env artifacts.
- `.opencode/tdd-guardian/config.json`: confirm commands match the scaffolded scripts.
- `AGENTS.md`: update command notes only if the actual scripts differ from the current guidance.

---

## Task 1: Backend Scaffold And Health

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/main.py`
- Create: `backend/app/api/health.py`
- Create: `backend/tests/conftest.py`
- Test: `backend/tests/test_health.py`

- [ ] **Step 1: Write the failing health test**

Create `backend/tests/test_health.py`:

```python
def test_health_returns_ok(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "careerpal-backend"}
```

- [ ] **Step 2: Run the health test to verify it fails**

Run:

```bash
cd backend && pytest tests/test_health.py -v
```

Expected: FAIL because the backend package, fixture, or route does not exist yet.

- [ ] **Step 3: Create the minimal backend scaffold**

Create `backend/pyproject.toml`:

```toml
[project]
name = "careerpal-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "alembic>=1.13",
  "email-validator>=2.1",
  "fastapi>=0.115",
  "httpx>=0.27",
  "passlib[bcrypt]>=1.7",
  "pydantic-settings>=2.4",
  "python-jose[cryptography]>=3.3",
  "sqlalchemy>=2.0",
  "uvicorn[standard]>=0.30"
]

[project.optional-dependencies]
dev = [
  "pytest>=8.3",
  "pytest-cov>=5.0"
]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
```

Create `backend/app/main.py`:

```python
from fastapi import FastAPI

from app.api.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(title="CareerPal API")
    app.include_router(health_router, prefix="/api")
    return app


app = create_app()
```

Create `backend/app/api/health.py`:

```python
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "careerpal-backend"}
```

Create `backend/tests/conftest.py`:

```python
import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client():
    with TestClient(create_app()) as test_client:
        yield test_client
```

- [ ] **Step 4: Run the health test to verify it passes**

Run:

```bash
cd backend && pytest tests/test_health.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/pyproject.toml backend/app backend/tests
git commit -m "feat: scaffold backend health check"
```

---

## Task 2: Backend Database, Auth, And Profile Creation

**Files:**
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/security.py`
- Create: `backend/app/db/base.py`
- Create: `backend/app/db/session.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/api/auth.py`
- Modify: `backend/app/main.py`
- Modify: `backend/tests/conftest.py`
- Test: `backend/tests/test_auth.py`

- [ ] **Step 1: Write failing auth behavior tests**

Create `backend/tests/test_auth.py`:

```python
def test_register_creates_user_profile_and_returns_token(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "alex@example.com", "username": "alexchen", "password": "secret123"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["user"] == {"id": body["user"]["id"], "email": "alex@example.com", "username": "alexchen"}

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "alex@example.com"


def test_register_rejects_duplicate_email(client):
    payload = {"email": "alex@example.com", "username": "alexchen", "password": "secret123"}
    assert client.post("/api/auth/register", json=payload).status_code == 201

    response = client.post(
        "/api/auth/register",
        json={"email": "alex@example.com", "username": "alex2", "password": "secret123"},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Email is already registered"


def test_login_returns_token_for_valid_credentials(client):
    client.post(
        "/api/auth/register",
        json={"email": "alex@example.com", "username": "alexchen", "password": "secret123"},
    )

    response = client.post("/api/auth/login", json={"email": "alex@example.com", "password": "secret123"})

    assert response.status_code == 200
    assert response.json()["access_token"]
    assert response.json()["user"]["username"] == "alexchen"


def test_login_rejects_invalid_password(client):
    client.post(
        "/api/auth/register",
        json={"email": "alex@example.com", "username": "alexchen", "password": "secret123"},
    )

    response = client.post("/api/auth/login", json={"email": "alex@example.com", "password": "wrongpass"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_me_requires_auth(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401
```

- [ ] **Step 2: Run auth tests to verify they fail**

Run:

```bash
cd backend && pytest tests/test_auth.py -v
```

Expected: FAIL because auth routes and database persistence do not exist.

- [ ] **Step 3: Implement database and auth minimally**

Implement:

- `Settings` in `backend/app/core/config.py` with `database_url`, `secret_key`, `access_token_expire_minutes`.
- `Base` in `backend/app/db/base.py`.
- engine/session dependency in `backend/app/db/session.py`.
- `User` and `Profile` models in `backend/app/models/user.py`, with one-to-one profile relationship.
- password hashing, verification, token creation, and token decoding in `backend/app/core/security.py`.
- Pydantic auth schemas in `backend/app/schemas/auth.py`.
- auth router in `backend/app/api/auth.py`.
- include auth router in `backend/app/main.py`.
- update `backend/tests/conftest.py` to create/drop tables against a temporary SQLite database per test.

Minimum route behavior:

```python
@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing_email = db.scalar(select(User).where(User.email == payload.email))
    if existing_email:
        raise HTTPException(status_code=409, detail="Email is already registered")
    existing_username = db.scalar(select(User).where(User.username == payload.username))
    if existing_username:
        raise HTTPException(status_code=409, detail="Username is already taken")
    user = User(
        email=payload.email,
        username=payload.username,
        password_hash=hash_password(payload.password),
        profile=Profile(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(access_token=create_access_token(str(user.id)), user=UserOut.model_validate(user))
```

- [ ] **Step 4: Run auth tests to verify they pass**

Run:

```bash
cd backend && pytest tests/test_auth.py -v
```

Expected: PASS.

- [ ] **Step 5: Run backend suite**

Run:

```bash
cd backend && pytest -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "feat: add backend auth and profile persistence"
```

---

## Task 3: Backend Profile Completeness And Conversation Placeholders

**Files:**
- Create: `backend/app/models/conversation.py`
- Create: `backend/app/schemas/profile.py`
- Create: `backend/app/schemas/conversation.py`
- Create: `backend/app/api/profile.py`
- Create: `backend/app/api/conversation.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_profile.py`
- Test: `backend/tests/test_conversation.py`

- [ ] **Step 1: Write failing profile tests**

Create `backend/tests/test_profile.py`:

```python
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


def test_completeness_reflects_name_and_empty_sections(client):
    headers = auth_headers(client)
    client.patch("/api/profile", headers=headers, json={"name": "Alex Chen"})

    response = client.get("/api/profile/completeness", headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "overall": "partial",
        "sections": {
            "basics": "partial",
            "summary": "empty",
            "experience": "empty",
            "skills": "empty",
            "projects": "empty",
            "education": "empty",
        },
    }
```

- [ ] **Step 2: Write failing conversation tests**

Create `backend/tests/test_conversation.py`:

```python
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
```

- [ ] **Step 3: Run focused tests to verify they fail**

Run:

```bash
cd backend && pytest tests/test_profile.py tests/test_conversation.py -v
```

Expected: FAIL because routes and conversation model do not exist.

- [ ] **Step 4: Implement profile and conversation routes**

Implement profile response fields exactly as tests expect. Store conversation `messages` as JSON array entries with:

```python
{"role": "user", "content": payload.content}
{"role": "assistant", "content": PLACEHOLDER_ASSISTANT_MESSAGE}
```

Use this constant in `backend/app/api/conversation.py`:

```python
PLACEHOLDER_ASSISTANT_MESSAGE = "I noted that. CareerPal's AI response will be enabled in a later milestone."
```

- [ ] **Step 5: Run focused tests to verify they pass**

Run:

```bash
cd backend && pytest tests/test_profile.py tests/test_conversation.py -v
```

Expected: PASS.

- [ ] **Step 6: Run backend suite**

Run:

```bash
cd backend && pytest -v
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend
git commit -m "feat: add profile and conversation contracts"
```

---

## Task 4: Alembic Migration And Backend Quality Gate

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/0001_initial.py`
- Modify: `backend/tests/test_health.py`

- [ ] **Step 1: Add failing migration smoke test**

Append to `backend/tests/test_health.py`:

```python
from pathlib import Path


def test_initial_migration_exists():
    migration = Path("alembic/versions/0001_initial.py")

    assert migration.exists()
    assert "create_table('users'" in migration.read_text()
    assert "create_table('profiles'" in migration.read_text()
    assert "create_table('conversations'" in migration.read_text()
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && pytest tests/test_health.py::test_initial_migration_exists -v
```

Expected: FAIL because migration files do not exist.

- [ ] **Step 3: Add Alembic configuration and initial migration**

Create migration files that create `users`, `profiles`, and `conversations` tables matching the SQLAlchemy models. The initial migration must include unique constraints for `users.email` and `users.username`, and a unique foreign key from `profiles.user_id` to `users.id`.

- [ ] **Step 4: Run migration smoke test**

Run:

```bash
cd backend && pytest tests/test_health.py::test_initial_migration_exists -v
```

Expected: PASS.

- [ ] **Step 5: Run backend suite with coverage**

Run:

```bash
cd backend && pytest --cov=app --cov-report=term --cov-report=json -v
```

Expected: PASS. Record any uncovered paths for later hardening if coverage is below the TDD Guardian target.

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "feat: add backend migrations"
```

---

## Task 5: Frontend Scaffold And API Client

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/next.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/lib/types.ts`
- Create: `frontend/src/lib/api.ts`
- Test: `frontend/src/lib/api.test.ts`

- [ ] **Step 1: Write failing API client tests**

Create `frontend/src/lib/api.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError } from "./api";

describe("ApiClient", () => {
  it("attaches bearer token and returns parsed JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ email: "alex@example.com" }),
    });
    const client = new ApiClient("http://api.test", () => "token-123", fetchMock as typeof fetch);

    const result = await client.me();

    expect(result).toEqual({ email: "alex@example.com" });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/auth/me", {
      headers: { Authorization: "Bearer token-123" },
    });
  });

  it("throws ApiError with backend detail", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ detail: "Email is already registered" }),
    });
    const client = new ApiClient("http://api.test", () => null, fetchMock as typeof fetch);

    await expect(client.register({ email: "alex@example.com", username: "alex", password: "secret123" })).rejects.toEqual(
      new ApiError(409, "Email is already registered"),
    );
  });
});
```

- [ ] **Step 2: Run API client tests to verify they fail**

Run:

```bash
cd frontend && pnpm test src/lib/api.test.ts --run
```

Expected: FAIL because frontend package and API client do not exist.

- [ ] **Step 3: Scaffold frontend and implement API client**

Create package scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

Implement `ApiError` and `ApiClient` methods:

- `register(payload)`
- `login(payload)`
- `me()`
- `getProfile()`
- `patchProfile(payload)`
- `getCompleteness()`
- `startConversation(payload)`
- `sendMessage(payload)`

Each JSON request must set `Content-Type: application/json`; authenticated requests must include `Authorization` when a token exists.

- [ ] **Step 4: Run API client tests to verify they pass**

Run:

```bash
cd frontend && pnpm test src/lib/api.test.ts --run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: scaffold frontend api client"
```

---

## Task 6: Frontend Stage Flow

**Files:**
- Create: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/globals.css`
- Create: `frontend/src/components/IntroScreen.tsx`
- Create: `frontend/src/components/AuthScreens.tsx`
- Create: `frontend/src/components/OnboardingScreen.tsx`
- Create: `frontend/src/components/Workspace.tsx`
- Create: `frontend/src/components/StageApp.tsx`
- Test: `frontend/src/components/StageApp.test.tsx`
- Test: `frontend/src/components/Workspace.test.tsx`

- [ ] **Step 1: Write failing stage flow tests**

Create `frontend/src/components/StageApp.test.tsx`:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StageApp } from "./StageApp";

function apiMock() {
  return {
    register: vi.fn().mockResolvedValue({ access_token: "token-123", user: { id: "u1", email: "alex@example.com", username: "alex" } }),
    login: vi.fn().mockResolvedValue({ access_token: "token-123", user: { id: "u1", email: "alex@example.com", username: "alex" } }),
    patchProfile: vi.fn().mockResolvedValue({ name: "Alex Chen" }),
    getProfile: vi.fn().mockResolvedValue({ name: "Alex Chen", headline: null, target_direction: null, education: [], experience: [], projects: [], skills: [], certificates: [] }),
    getCompleteness: vi.fn().mockResolvedValue({ overall: "partial", sections: { basics: "partial", summary: "empty", experience: "empty", skills: "empty", projects: "empty", education: "empty" } }),
    startConversation: vi.fn().mockResolvedValue({ id: "c1", context_type: "career", focus_node: null, messages: [] }),
    sendMessage: vi.fn().mockResolvedValue({ assistant_message: { role: "assistant", content: "I noted that. CareerPal's AI response will be enabled in a later milestone." }, messages: [] }),
  };
}

describe("StageApp", () => {
  it("preserves signup -> name -> onboarding -> workspace flow", async () => {
    const api = apiMock();
    render(<StageApp api={api} />);

    await userEvent.click(screen.getByRole("button", { name: /get started/i }));
    await userEvent.type(screen.getByLabelText(/email/i), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/username/i), "alex");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/what should i call you/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/your name/i), "Alex Chen");
    await userEvent.click(screen.getByRole("button", { name: /nice to meet you/i }));

    expect(await screen.findByText(/do you have a resume/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /show me my workspace/i }));

    await waitFor(() => expect(api.getProfile).toHaveBeenCalled());
    expect(await screen.findByText(/Alex Chen/)).toBeInTheDocument();
    expect(screen.getByText(/profile completion/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run stage tests to verify they fail**

Run:

```bash
cd frontend && pnpm test src/components/StageApp.test.tsx --run
```

Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement minimal stage components**

Implement production components with accessible labels matching the tests:

- Intro button text: `Get started`
- Signup labels: `Email`, `Username`, `Password`
- Name heading: `What should I call you?`
- Name label: `Your name`
- Name button: `Nice to meet you`
- Onboarding prompt: `Do you have a resume you can share with me?`
- Onboarding workspace button: `Show me my workspace`
- Workspace heading includes the profile name.
- Workspace side panel includes `Profile completion`.

Use CSS variables adapted from `docs/careerpal/project/styles.css` for `--accent`, `--ink`, `--bg`, font stack, buttons, centered auth card, chat column, and side panel.

- [ ] **Step 4: Run stage tests to verify they pass**

Run:

```bash
cd frontend && pnpm test src/components/StageApp.test.tsx --run
```

Expected: PASS.

- [ ] **Step 5: Add workspace rendering test**

Create `frontend/src/components/Workspace.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Workspace } from "./Workspace";

describe("Workspace", () => {
  it("renders profile and completeness states from backend data", () => {
    render(
      <Workspace
        profile={{ name: "Alex Chen", headline: "CS student", target_direction: "Backend SWE", education: [], experience: [], projects: [], skills: [], certificates: [] }}
        completeness={{ overall: "partial", sections: { basics: "partial", summary: "empty", experience: "empty", skills: "empty", projects: "empty", education: "empty" } }}
        onLogout={() => undefined}
      />,
    );

    assertVisible("Alex Chen");
    assertVisible("Backend SWE");
    assertVisible("Basics");
    assertVisible("partial");
  });
});

function assertVisible(text: string) {
  expect(screen.getByText(text)).toBeInTheDocument();
}
```

- [ ] **Step 6: Run frontend suite**

Run:

```bash
cd frontend && pnpm test --run
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend
git commit -m "feat: add frontend careerpal flow"
```

---

## Task 7: Full Project Gates And Developer Commands

**Files:**
- Modify: `.gitignore`
- Modify: `.opencode/tdd-guardian/config.json`
- Modify: `AGENTS.md`
- Create: `README.md`

- [ ] **Step 1: Write failing command documentation check**

Create `backend/tests/test_repo_docs.py`:

```python
from pathlib import Path


def test_readme_documents_separate_app_commands():
    readme = Path("../README.md").read_text()

    assert "cd backend && pytest" in readme
    assert "cd frontend && pnpm test --run" in readme
    assert "cd backend && uvicorn app.main:app --reload" in readme
    assert "cd frontend && pnpm dev" in readme
```

- [ ] **Step 2: Run documentation test to verify it fails**

Run:

```bash
cd backend && pytest tests/test_repo_docs.py -v
```

Expected: FAIL because `README.md` does not document the commands yet.

- [ ] **Step 3: Add repo README and ignore rules**

Create `README.md` with:

```markdown
# CareerPal

CareerPal is split into two applications:

- `frontend/`: Next.js React SPA.
- `backend/`: FastAPI API.

## Backend

Run tests:

```bash
cd backend && pytest
```

Run locally:

```bash
cd backend && uvicorn app.main:app --reload
```

## Frontend

Run tests:

```bash
cd frontend && pnpm test --run
```

Run locally:

```bash
cd frontend && pnpm dev
```
```

Update `.gitignore` with:

```gitignore
__pycache__/
.pytest_cache/
.coverage
coverage/
htmlcov/
.venv/
node_modules/
.next/
dist/
.env
.env.*
!.env.example
```

Confirm `.opencode/tdd-guardian/config.json` uses:

```json
"testCommand": "sh -c 'cd frontend && pnpm test --run && cd ../backend && pytest'"
```

- [ ] **Step 4: Run all available tests**

Run:

```bash
cd backend && pytest -v
cd ../frontend && pnpm test --run
```

Expected: PASS.

- [ ] **Step 5: Run build checks**

Run:

```bash
cd frontend && pnpm build
```

Expected: PASS.

- [ ] **Step 6: Start local dev servers**

Backend:

```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend && pnpm dev
```

Expected:

- Backend serves `http://127.0.0.1:8000/api/health`.
- Frontend serves the CareerPal app on the printed Next.js local URL.

- [ ] **Step 7: Commit**

```bash
git add README.md .gitignore .opencode/tdd-guardian/config.json AGENTS.md backend/tests/test_repo_docs.py
git commit -m "docs: add project commands and gates"
```

---

## Self-Review

Spec coverage:

- Separate frontend/backend apps: Tasks 1 and 5.
- Real auth/profile persistence: Task 2.
- Profile/completeness API: Task 3.
- Conversation placeholder contract: Task 3.
- Alembic migration: Task 4.
- Design-bundle stage flow: Task 6.
- TDD and gates: every task includes red, green, verification, and commit steps.

Deferred requirements from the design spec remain intentionally out of scope: LLM integration, resume parsing, OSS, generated page hosting, deployment, SSE streaming, and pixel-perfect full prototype migration.

Scope-language scan:

- The word "placeholder" appears only for deterministic milestone contracts, not as missing plan work.
- The plan does not contain unresolved marker text or vague future-work instructions.

Type consistency:

- Backend route names and frontend client methods match across tasks.
- Profile/completeness response fields match frontend tests.
- Conversation response fields match frontend and backend tests.
