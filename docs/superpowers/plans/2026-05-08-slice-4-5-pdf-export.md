# Slice 4.5 PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Scope

Add an authenticated one-click PDF export for the current structured profile. Keep the output conventional, ATS-friendly, and generated from profile tables rather than the public HTML page.

## Design Constraints

- Follow `docs/careerpal/project/screens.jsx`: resume/version surfaces use `Download PDF` as a plain action.
- Put the first export action in the existing living resume screen without redesigning the page.
- Export must be auth-only and must not expose another user's profile.
- Avoid third-party services in this slice. Use an in-process PDF generator already available in backend dependencies.
- OSS persistence can be added behind the storage abstraction later; this slice streams a downloadable PDF directly.

## Files

- `backend/app/api/page.py`: add authenticated `/page/export/pdf` route.
- `backend/app/services/pdf_export.py`: render structured profile data into PDF bytes.
- `backend/tests/test_pdf_export.py`: backend TDD coverage.
- `frontend/src/lib/types.ts`: export response type only if needed.
- `frontend/src/lib/api.ts`: add `exportProfilePdf`.
- `frontend/src/lib/api.test.ts`: API method test.
- `frontend/src/components/workspace/ResumeScreen.tsx`: add Download PDF action and loading/error state.
- `frontend/src/components/workspace/Workspace.tsx`: pass export callback.
- `frontend/src/components/Workspace.tsx`: wrapper passthrough.
- `frontend/src/components/StageApp.tsx`: call API and trigger browser download.
- `frontend/src/components/Workspace.test.tsx`: ResumeScreen behavior.
- `frontend/src/components/StageApp.test.tsx`: integration behavior/error handling.

## Tasks

- [x] Add failing backend tests for authenticated PDF export including profile content, PDF headers, filename, and auth requirement.
- [x] Add failing backend service tests or endpoint assertions that empty sections are omitted and non-empty structured sections are included.
- [x] Implement minimal PDF rendering service and backend endpoint.
- [x] Add failing frontend API test for binary PDF export with bearer auth.
- [x] Add failing Workspace/ResumeScreen tests for Download PDF action and disabled loading state.
- [x] Add failing StageApp tests for successful browser download and export failure message.
- [x] Implement frontend API, wiring, and design-faithful button.
- [x] Run focused tests, full backend/frontend gates, review, commit, push.
