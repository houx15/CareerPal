# Slice 4.4 Public Page Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Scope

Expose generated profile pages at a public username route and add the authenticated setting needed to publish or unpublish the latest page. Preserve private-by-default behavior.

## Design Constraints

- Follow `docs/careerpal/project/screens.jsx` `ResumeScreen`: the living resume card shows `careerpal.co/{handle}` and created-state page actions.
- Keep generated pages private by default until the user publishes.
- Do not add deployment/domain assumptions in this slice; the public URL can be a path-based `/p/{username}` route behind the backend.
- Do not expose private HTML through unauthenticated endpoints.

## Files

- `backend/app/api/page.py`: authenticated settings endpoint.
- `backend/app/api/public.py`: public page route.
- `backend/app/main.py`: register public route without `/api` prefix.
- `backend/app/schemas/page.py`: settings request/response if needed.
- `backend/tests/test_public_page.py`: backend TDD tests.
- `frontend/src/lib/types.ts`: page settings payload if needed.
- `frontend/src/lib/api.ts`: settings method.
- `frontend/src/components/workspace/ResumeScreen.tsx`: publish/unpublish/open public page controls.
- `frontend/src/components/workspace/Workspace.tsx`: pass page settings callback.
- `frontend/src/components/Workspace.tsx`: wrapper prop passthrough.
- `frontend/src/components/StageApp.tsx`: API wiring and state refresh.
- Frontend API/workspace/StageApp tests.

## Tasks

- [x] Add failing backend tests for anonymous `/p/{username}` returning latest public page HTML.
- [x] Add failing backend tests proving private pages and missing users/pages return 404 without leaking HTML.
- [x] Add failing backend tests for authenticated `/api/page/settings` toggling the latest page public/private and requiring an existing page.
- [x] Implement backend public route and settings endpoint.
- [x] Add failing frontend API tests for page settings.
- [x] Add failing Workspace/ResumeScreen tests for publish/unpublish and opening the public route only when public.
- [x] Add failing StageApp tests that toggling publish updates generated page state.
- [x] Implement frontend wiring with design-bundle layout.
- [x] Run focused tests, full backend/frontend gates, review, commit, push.
