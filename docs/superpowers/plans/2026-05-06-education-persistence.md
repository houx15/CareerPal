# Education Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist Education items from the existing CareerPal workspace edit drawer through the real backend profile API.

**Architecture:** Add an `educations` table related to `Profile`, expose education as a list on `GET /api/profile`, and accept full education-list replacement through `PATCH /api/profile`. Keep the UI layout and interaction model from `docs/careerpal/project/workspace.jsx`: local drawer draft, editable cards, add/remove item, Save/Cancel footer.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, pytest, Next.js/React, Vitest/Testing Library.

---

### Task 1: Backend Education Persistence

**Files:**
- Modify: `backend/tests/test_profile.py`
- Modify: `backend/app/models/user.py`
- Modify: `backend/app/schemas/profile.py`
- Modify: `backend/app/api/profile.py`
- Create: `backend/alembic/versions/0003_education_items.py`

- [x] **Step 1: Write failing backend tests**

Add tests asserting:
- `GET /api/profile` returns `education: []` for a new profile.
- `PATCH /api/profile` accepts an `education` list and persists it in display order.
- Replacing education with a shorter list removes old items.
- `/api/profile/completeness` reports `education: "complete"` when at least one education item has `school`, `degree`, and `time`.

- [x] **Step 2: Run backend profile tests and verify RED**

Run: `cd backend && pytest tests/test_profile.py -q`

Expected: FAIL because `education` patch is currently rejected and completeness always reports education empty.

- [x] **Step 3: Implement backend model/schema/API**

Add an `Education` SQLAlchemy model with:
- `id`
- `profile_id`
- `school`
- `degree`
- `time`
- `comment`
- `sort_order`

Add Pydantic education item schemas. Update profile response serialization to return education ordered by `sort_order`. Update profile patch handling to replace `profile.education_items` when `education` is supplied, while preserving existing scalar field patch behavior.

- [x] **Step 4: Add migration**

Create `0003_education_items.py` with `upgrade()` creating the `educations` table and index on `profile_id`; `downgrade()` drops them.

- [x] **Step 5: Run backend profile tests and verify GREEN**

Run: `cd backend && pytest tests/test_profile.py -q`

Expected: PASS.

### Task 2: Frontend Education Drawer Persistence

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/Workspace.tsx`
- Modify: `frontend/src/components/workspace/Workspace.tsx`
- Modify: `frontend/src/components/workspace/WorkspaceOverlays.tsx`
- Modify: `frontend/src/components/Workspace.test.tsx`
- Modify: `frontend/src/components/StageApp.test.tsx`

- [x] **Step 1: Write failing frontend tests**

Add a workspace test that:
- Opens the Education edit drawer.
- Edits School, Degree, and Period fields.
- Clicks Save.
- Asserts `onPatchProfile` receives `education: [{ school, degree, time }]`.
- Asserts the updated education appears on the profile card after save.

- [x] **Step 2: Run workspace tests and verify RED**

Run: `cd frontend && npm test -- --run src/components/Workspace.test.tsx`

Expected: FAIL because the drawer currently shows generic basics fields for education and returns `{}` for non-basics sections.

- [x] **Step 3: Implement design-faithful education drawer**

Port the education drawer behavior from `docs/careerpal/project/workspace.jsx`:
- Show current education cards.
- Fields: School, Degree, Period.
- Add button appends `{ school: "", degree: "", time: "" }`.
- Remove button deletes an item.
- Save maps to `education`.

Update frontend profile types and workspace adapter so backend education items override demo education data.

- [x] **Step 4: Run workspace tests and verify GREEN**

Run: `cd frontend && npm test -- --run src/components/Workspace.test.tsx`

Expected: PASS.

### Task 3: Verification And Commit

- [x] **Step 1: Apply migration locally**

Run: `cd backend && alembic upgrade head`

- [x] **Step 2: Run backend tests**

Run: `cd backend && pytest`

- [x] **Step 3: Run frontend tests**

Run: `cd frontend && npm test -- --run`

- [x] **Step 4: Run frontend type check**

Run: `cd frontend && npx tsc --noEmit`

- [x] **Step 5: Run frontend build**

Run: `cd frontend && npm run build`

- [ ] **Step 6: Commit**

Run: `git add ... && git commit -m "feat: persist education profile items"`
