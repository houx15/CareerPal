# Slice 6.3: Improve And Log Progress

## Goal

Let the user submit evidence for a growth-plan node, persist that progress, update the node's quality/state, and reflect the evidence back into the profile so the progress survives reload.

## Scope

- Add persisted growth progress logs linked to the current user and growth plan.
- Add an authenticated endpoint to log progress for a node in the current plan.
- Update the target node quality and state after logging progress.
- Append a concise profile comment note referencing the logged growth evidence.
- Add frontend API, StageApp/Workspace/Grow wiring, and a design-faithful improve overlay submit flow.

## Out Of Scope

- Rich AI coaching chat history, fork suggestions, and unlock logic. Those can be separate follow-up slices.
- Multiple growth plans or plan history.

## TDD Plan

1. Backend red tests:
   - progress logging requires auth.
   - logging evidence updates the node quality/state and persists a log.
   - logged progress survives `GET /growth/plan`.
   - logging progress for another/missing node returns 404.
   - profile comment includes the growth evidence note.
2. Frontend red tests:
   - API client posts node evidence to `/api/growth/plan/nodes/{node_id}/progress`.
   - Grow screen can open an active node, submit evidence, and render updated quality/state.
   - StageApp passes the log action through and refreshes local growth/profile state.
3. Implementation:
   - Add model/migration/schema/route.
   - Add frontend types/API and minimal improve overlay.
4. Review and verification:
   - Focused tests while implementing.
   - Subagent review before commit.
   - Full backend/frontend gates before commit/push.
