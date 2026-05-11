# Slice 6.1: Growth Plan Data Model

## Goal

Persist the Grow skill tree so the Grow screen can render user-specific roadmap data from the backend instead of hard-coded demo cards.

## Scope

- Add a per-user growth plan model with goal text and JSON-backed nodes.
- Add authenticated growth plan read/upsert API endpoints.
- Add frontend API types/client methods.
- Load growth plan during workspace bootstrap.
- Render the persisted tree in the Grow screen using the design-bundle geometric tree style.

## Out Of Scope

- LLM-generated roadmaps from match gaps. That starts in Slice 6.2.
- Node progress/improvement chat. That starts in Slice 6.3.
- Multiple named growth plans per user.

## TDD Plan

1. Backend red tests for authenticated growth plan upsert/read, user isolation, validation, and auth guard.
2. Frontend red tests for API client methods and StageApp/Workspace rendering of persisted Grow tree data.
3. Implement backend model, schema, API, migration, and app registration.
4. Implement frontend types, API client, StageApp state loading, Workspace pass-through, and design-faithful Grow tree rendering.
5. Run focused tests, full backend/frontend suites, type check, build, migration sanity, and `git diff --check`.
6. Request/read review, fix findings, then commit and push.
