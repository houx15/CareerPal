# Slice 7.1 Error Loading Empty States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CareerPal fail clearly across common API loading, empty, auth-expiration, network, and invalid-payload states without breaking the design-bundle layout.

**Architecture:** Keep this as a frontend hardening slice. Reuse current error surfaces in `StageApp`, `Workspace`, and screen components; add only small shared helpers if tests reveal repeated state handling. Backend changes are out of scope unless an API returns an unusable error shape.

**Tech Stack:** React/Next.js, Vitest, Testing Library, existing FastAPI client.

---

## Scope

Implement the smallest hardening pass that satisfies Milestone 7.1:

- Auth expiration: session-loading failures that return 401 should send the user back to login with a clear message.
- Network failure: login/workspace actions should show clear error text without layout collapse.
- Empty profile: workspace should keep the design shell and show empty-state affordances rather than sample data pretending to be persisted data.
- Invalid payloads: validation/API errors should stay visible near the relevant action and preserve user drafts.
- Existing design classes/layout must remain compatible with `docs/careerpal`.

## Files

- Modify: `frontend/src/components/StageApp.tsx`
  - centralize auth-expiration handling during workspace load.
  - keep workspace load errors visible on login/onboarding screens.
- Modify: `frontend/src/components/AuthScreens.tsx`
  - preserve existing form layout while showing network/auth errors and submitting labels.
- Modify: `frontend/src/components/workspace/Workspace.tsx`
  - pass through empty profile states without hiding the design shell.
  - expose screen-level error/empty states where missing.
- Modify as needed: screen components under `frontend/src/components/workspace/`
  - add focused empty/loading/error states to Match, Resume, Grow, and profile workflows without restyling.
- Test: `frontend/src/components/StageApp.test.tsx`
- Test: `frontend/src/components/Workspace.test.tsx`
- Test: `frontend/src/components/workspace/WorkspaceScreens.test.tsx`
- Test: `frontend/src/lib/api.test.ts` only if error parsing gaps are found.

## Status

Implemented in this slice:

- StageApp auth-expiration and workspace-load network errors.
- Explicit empty persisted profile handling without demo content leakage.
- Grow progress failure preservation for the Improve overlay.
- Focused and full verification listed below.

Deferred to later hardening work:

- Broader optional-handler unavailable states in Resume/Match.
- Resume upload/structure failure expansions.

## Task 1: StageApp Auth Expiration And Workspace Load Errors

- [x] Add failing tests in `frontend/src/components/StageApp.test.tsx`:
  - login succeeds but `getProfile` rejects `new ApiError(401, "Token expired")`; expect login screen again and visible `Token expired`.
  - login succeeds but `getProfile` rejects `new Error("Network unavailable")`; expect login screen remains usable and visible `Network unavailable`.
- [x] Run `npm test -- --run src/components/StageApp.test.tsx` and confirm the new tests fail.
- [x] Implement the minimum state handling in `StageApp.tsx`.
- [x] Re-run the focused test and confirm it passes.

## Task 2: Empty Profile State

- [x] Add failing tests in `frontend/src/components/Workspace.test.tsx` for a persisted empty profile:
  - `profile={{ name: null, headline: null, comment: null, education: [], experience: [], projects: [], skills: [], certificates: [] }}` should still show the app shell, but should not show demo/sample projects or skills as if they were the user's persisted data.
  - profile cards should expose edit actions so the user can recover from empty data.
- [x] Run the focused Workspace test and confirm failure.
- [x] Adjust `Workspace.tsx` data normalization to distinguish omitted props from explicit empty persisted arrays/nulls.
- [x] Re-run focused Workspace tests.

## Task 3: Screen-Level API Failure States

- [x] Add failing tests in `WorkspaceScreens.test.tsx`:
  - Match analysis failure keeps the JD draft visible and shows the API error. Existing coverage may already satisfy this; add only missing assertions.
  - Growth progress logging failure keeps the Improve overlay open, preserves submitted evidence, and shows the error.
  - Page generation/customization errors keep the selected screen stable and preserve drafts. Existing coverage may already satisfy part of this; fill gaps only.
- [x] Run focused tests and confirm new assertions fail where behavior is missing.
- [x] Implement focused error states without broad component rewrites.
- [x] Re-run focused tests.

## Task 4: Review And Verification

- [x] Dispatch spec-compliance and code-quality review agents over the uncommitted diff.
- [x] Fix any accepted findings with failing tests first.
- [x] Run full verification:
  - `cd frontend && npm test -- --run`
  - `cd frontend && npx tsc --noEmit`
  - `cd frontend && npm run build`
  - `cd backend && pytest -q`
  - `cd backend && alembic upgrade head`
  - `git diff --check`
- [ ] Commit and push:
  - `git commit -m "feat: harden frontend states"`
  - `git push`

## Out Of Scope

- Full Playwright/browser E2E. That is Slice 7.2.
- Deployment docs/config. That is Slice 7.3.
- New backend endpoint contracts unless frontend cannot present current backend errors clearly.
