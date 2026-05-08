# Slice 4.3 Page Preview And Customization Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Scope

Connect the design-bundle living resume site UI to generated pages and add a page-specific customization path that regenerates new page versions without mixing into career coaching conversations.

## Design Constraints

- Follow `docs/careerpal/project/screens.jsx` `ResumeScreen`: template chooser, create button, created state with edit/open actions, and `careerpal.co/{handle}` URL surface.
- Keep three backend template ids: `clean-professional`, `modern-creative`, `technical`; frontend labels follow design terms `Clean`, `Modern`, `Terminal`.
- Page customization conversations use `context_type: "page"` and must not trigger career extraction.
- Automated tests use deterministic stubs; no real LLM/network in tests.

## Files

- `backend/app/schemas/page.py`: customization request/response schema.
- `backend/app/services/page_generation.py`: customization prompt builder.
- `backend/app/api/page.py`: `POST /api/page/customize`.
- `backend/tests/test_page_customization.py`: backend TDD tests.
- `frontend/src/lib/types.ts`: generated page and template types.
- `frontend/src/lib/api.ts`: generate/customize methods.
- `frontend/src/components/workspace/ResumeScreen.tsx`: design-faithful preview and customization controls.
- `frontend/src/components/workspace/Workspace.tsx`: page props/callbacks.
- `frontend/src/components/StageApp.tsx`: API wiring and separate page conversation management.
- Frontend tests around API client, workspace resume UI, and StageApp integration.

## Tasks

- [x] Add failing backend tests for page customization regenerating a new version and appending page conversation messages.
- [x] Add failing backend tests rejecting non-page conversations, missing existing page, blank instructions, and LLM/non-HTML failures without persisting.
- [x] Implement backend customization endpoint through the LLM abstraction with SSE done/error events.
- [x] Add failing frontend API client tests for generate/customize endpoints.
- [x] Add failing Workspace/ResumeScreen tests for template selection, create, preview iframe, customization callback, failed request retention, and in-flight disabling.
- [x] Add failing StageApp tests proving page conversations use `context_type: "page"` and stay separate from career conversations.
- [x] Implement frontend wiring with design-bundle layout.
- [x] Run focused tests, full backend/frontend gates, review, commit, push.
