# Slice 4.1 Page Data Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persisted generated page versions with authenticated latest-preview and version-history endpoints.

**Architecture:** Introduce a `GeneratedPage` table owned by user id. Keep this slice data-model only: tests seed page rows directly, while later slices add LLM generation, customization, public hosting, and export behavior.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, pytest.

---

### Task 1: Page API Contract Tests

**Files:**
- Create: `backend/tests/test_page.py`

- [x] **Step 1: Write failing tests**

Cover authenticated latest preview, version history, ownership isolation, no-page 404, and auth requirement.

- [x] **Step 2: Run tests to verify RED**

Run: `cd backend && python3 -m pytest tests/test_page.py -q`

Expected: FAIL because `app.models.page` and `/api/page/*` do not exist.

### Task 2: Page Model And API Implementation

**Files:**
- Create: `backend/app/models/page.py`
- Create: `backend/app/schemas/page.py`
- Create: `backend/app/api/page.py`
- Create: `backend/alembic/versions/0012_generated_pages.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/tests/conftest.py`

- [x] **Step 1: Add `GeneratedPage` model and migration**

Fields: `id`, `user_id`, `html_content`, `style_template`, `version`, `is_public`, `created_at`.

- [x] **Step 2: Add page schemas and endpoints**

Implement:
- `GET /api/page/preview`
- `GET /api/page/versions`

- [x] **Step 3: Run focused GREEN tests**

Run: `cd backend && python3 -m pytest tests/test_page.py -q`

### Task 3: Verification And Review

**Files:**
- All changed backend files

- [x] **Step 1: Run backend test suite**

Run: `cd backend && python3 -m pytest`

- [x] **Step 2: Run frontend regression checks**

Run: `cd frontend && npm test -- --run && npx tsc --noEmit && npm run build`

- [x] **Step 3: Request subagent review**

Review for ownership isolation, endpoint contract, migration correctness, and scope creep.
