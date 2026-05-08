# Slice 5.1 JD Input And History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Scope

Add the first backend-backed Match workflow. Users can paste a job description, receive a deterministic saved match analysis, and see that match in recent history. Real LLM comparison is deferred to Slice 5.2.

## Design Constraints

- Follow `docs/careerpal/project` Match flow: JD entry first, result below, recent matches visible on the Match surface.
- Do not redesign the workspace shell.
- Keep Slice 5.1 deterministic and local; no new third-party service or secret needed.
- Persist match history per authenticated user only.

## Files

- `backend/app/models/match.py`: persisted job match analysis table.
- `backend/app/schemas/match.py`: request and response contracts.
- `backend/app/services/match_analysis.py`: deterministic parser/scorer for this slice.
- `backend/app/api/match.py`: authenticated analyze/history routes.
- `backend/app/main.py`, `backend/app/models/__init__.py`, `backend/tests/conftest.py`: wire model/router.
- `backend/tests/test_match.py`: backend TDD coverage.
- `frontend/src/lib/types.ts`: job match types.
- `frontend/src/lib/api.ts`, `frontend/src/lib/api.test.ts`: match analyze/history methods.
- `frontend/src/components/StageApp.tsx`: load and submit matches.
- `frontend/src/components/Workspace.tsx`, `frontend/src/components/workspace/Workspace.tsx`: pass match props.
- `frontend/src/components/workspace/MatchScreen.tsx`: design-faithful backend-backed entry/result/history.
- `frontend/src/components/StageApp.test.tsx`, `frontend/src/components/workspace/WorkspaceScreens.test.tsx`: frontend TDD coverage.

## Tasks

- [x] Add failing backend tests for auth, blank JD validation, persisted analysis response, history ordering, and user isolation.
- [x] Implement backend model/schema/service/router wiring with deterministic analysis.
- [x] Add failing frontend API tests for analyze/history auth contracts.
- [x] Add failing Match screen/StageApp tests for submitting a JD, rendering result, showing recent history, and preserving design copy.
- [x] Implement frontend API, state wiring, and Match screen changes.
- [x] Run focused tests, full backend/frontend gates, review, commit, push.
