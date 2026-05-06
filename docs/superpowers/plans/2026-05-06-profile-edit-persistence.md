# Profile Edit Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist profile edits made from the CareerPal workspace edit drawer without changing the design specified in `docs/careerpal/project/workspace.jsx`.

**Architecture:** Keep the prototype workspace visual structure intact. Thread a `patchProfile` callback from `StageApp` into the workspace shell, let the edit drawer maintain a local draft, and save only backend-supported profile fields for this slice: `name`, `headline`, `target_direction`, and `comment`. Treat unsupported design fields such as location and contact email as display-only until the structured profile schema phase.

**Tech Stack:** Next.js/React, Vitest/Testing Library, existing FastAPI profile API.

---

### Task 1: Frontend Save Contract

**Files:**
- Modify: `frontend/src/components/StageApp.tsx`
- Modify: `frontend/src/components/Workspace.tsx`
- Modify: `frontend/src/components/workspace/Workspace.tsx`
- Modify: `frontend/src/components/workspace/WorkspaceOverlays.tsx`
- Test: `frontend/src/components/Workspace.test.tsx`

- [x] **Step 1: Write the failing test**

Add a workspace test that opens the basics edit drawer, changes the name and role fields, clicks Save, and asserts the save callback receives `{ name, headline }` and the updated name appears in the profile hero.

- [x] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --run src/components/Workspace.test.tsx`

Expected: FAIL because `Workspace` does not accept or call a profile save callback and the drawer fields are uncontrolled.

- [x] **Step 3: Implement minimal save flow**

Add `onPatchProfile(payload: ProfilePatch): Promise<Partial<WorkspaceProfile>>` through `StageApp -> Workspace adapter -> prototype Workspace -> EditDrawer`. In `StageApp`, merge the returned profile fields into local `profile`. In the drawer, keep draft state, map design fields to backend fields, disable Save while saving, show an inline error if save fails, and close on success.

- [x] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- --run src/components/Workspace.test.tsx`

Expected: PASS.

### Task 2: Summary Save

**Files:**
- Modify: `frontend/src/components/workspace/WorkspaceOverlays.tsx`
- Test: `frontend/src/components/Workspace.test.tsx`

- [x] **Step 1: Write the failing test**

Add a test that opens the summary edit drawer, changes the summary textarea, clicks Save, and asserts the callback receives `{ comment }`.

- [x] **Step 2: Run test to verify current behavior**

Run: `cd frontend && npm test -- --run src/components/Workspace.test.tsx`

Result: PASS because the Task 1 drawer save implementation already included the summary-to-`comment` mapping.

- [x] **Step 3: Implement minimal summary mapping**

Map the design summary field to backend `comment`, while continuing to display `comment` as the profile summary when present.

- [x] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- --run src/components/Workspace.test.tsx`

Expected: PASS.

### Task 3: Verification

**Files:**
- No production edits unless verification exposes a defect.

- [x] **Step 1: Run focused frontend tests**

Run: `cd frontend && npm test -- --run src/components/Workspace.test.tsx`

- [x] **Step 2: Run full frontend tests**

Run: `cd frontend && npm test -- --run`

- [x] **Step 3: Run type check**

Run: `cd frontend && npx tsc --noEmit`

- [x] **Step 4: Run build**

Run: `cd frontend && npm run build`

- [x] **Step 5: Confirm backend remains green**

Run: `cd backend && pytest`
