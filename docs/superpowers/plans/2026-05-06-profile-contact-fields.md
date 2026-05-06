# Profile Contact Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the CareerPal design drawer's remaining basics fields: contact email, phone, and location.

**Architecture:** Extend the existing `profiles` table and profile API contract with small scalar fields. Keep the workspace UI shape from `docs/careerpal/project/workspace.jsx`; map drawer Email/Phone/Location to the backend profile response and patch payload. This is intentionally separate from education/experience/project/skill entity work.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Next.js/React, Vitest/Testing Library, pytest.

---

### Task 1: Backend Profile Contact Contract

**Files:**
- Modify: `backend/tests/test_profile.py`
- Modify: `backend/app/models/user.py`
- Modify: `backend/app/schemas/profile.py`
- Modify: `backend/app/api/profile.py`
- Create: `backend/alembic/versions/0002_profile_contact_fields.py`

- [x] **Step 1: Write failing backend tests**

Assert `GET /api/profile` returns `phone`, `contact_email`, and `location` as `null` for new users, and `PATCH /api/profile` persists those fields.

- [x] **Step 2: Run backend profile tests and verify RED**

Run: `cd backend && pytest tests/test_profile.py -q`

Expected: FAIL because the response omits the new contact fields and patch rejects them.

- [x] **Step 3: Implement backend schema/model/migration**

Add nullable `phone`, `contact_email`, and `location` columns to `Profile`, include them in Pydantic response/update schemas, include them in `_profile_response`, and create an Alembic upgrade/downgrade migration.

- [x] **Step 4: Run backend profile tests and verify GREEN**

Run: `cd backend && pytest tests/test_profile.py -q`

Expected: PASS.

### Task 2: Frontend Contact Drawer Save

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/Workspace.tsx`
- Modify: `frontend/src/components/workspace/Workspace.tsx`
- Modify: `frontend/src/components/workspace/WorkspaceOverlays.tsx`
- Modify: `frontend/src/components/Workspace.test.tsx`
- Modify: `frontend/src/components/StageApp.test.tsx`

- [x] **Step 1: Write failing frontend test**

Extend the basics drawer test to edit Location and Email, assert `onPatchProfile` receives `location` and `contact_email`, and assert the updated location appears in the hero.

- [x] **Step 2: Run workspace test and verify RED**

Run: `cd frontend && npm test -- --run src/components/Workspace.test.tsx`

Expected: FAIL because the frontend does not include contact fields in `ProfilePatch`.

- [x] **Step 3: Implement frontend types and mappings**

Add `phone`, `contact_email`, and `location` to frontend profile types. Pass persisted contact fields into the workspace, display `location` in the hero, and save Email/Phone/Location from the basics drawer.

- [x] **Step 4: Run workspace test and verify GREEN**

Run: `cd frontend && npm test -- --run src/components/Workspace.test.tsx`

Expected: PASS.

### Task 3: Verification

- [x] **Step 1: Run backend tests**

Run: `cd backend && pytest`

- [x] **Step 2: Run frontend tests**

Run: `cd frontend && npm test -- --run`

- [x] **Step 3: Run frontend type check**

Run: `cd frontend && npx tsc --noEmit`

- [x] **Step 4: Run frontend build**

Run: `cd frontend && npm run build`
