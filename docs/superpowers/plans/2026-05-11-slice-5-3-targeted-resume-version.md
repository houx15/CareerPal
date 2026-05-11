# Slice 5.3: Save Targeted Resume Version

## Goal

Let a user save a targeted resume/page version from a match analysis and make that saved version visible from both Match history and Resume version history.

## Sources

- Product spec: `docs/SPEC.md`, Phase 2 Match
- Roadmap: `docs/superpowers/plans/2026-05-07-careerpal-master-roadmap.md`, Slice 5.3
- Design bundle: `docs/careerpal/project/match.jsx`, `docs/careerpal/project/screens.jsx`
- Existing implementation: `backend/app/api/match.py`, `backend/app/api/page.py`, `frontend/src/components/workspace/MatchScreen.tsx`, `frontend/src/components/workspace/ResumeScreen.tsx`

## Scope

- Extend generated page versions with optional targeted-match metadata.
- Link a saved generated page version back to the originating match analysis.
- Add an authenticated API endpoint to save a targeted version from a match.
- Add frontend API and StageApp wiring.
- Keep the design-bundle Match result flow: save control lives on the result score panel; history shows saved state.
- Render targeted versions in the Resume screen version history section.

## Out Of Scope

- Editing targeted version content after save.
- Multiple saved versions per single match. This slice keeps one current saved version link per match.
- Word export.
- Growth plan generation.

## TDD Plan

1. Backend tests first:
   - Saving a match creates a generated page version with source match metadata.
   - Match detail/history include the saved page link/version.
   - Page versions include targeted match metadata.
   - User isolation prevents saving another user's match.
2. Frontend tests first:
   - API client posts to save-targeted-version endpoint.
   - Match result save action calls StageApp and shows saved version state.
   - Resume screen renders targeted versions.
3. Confirm focused tests fail.
4. Implement backend model/schema/migration/API/service changes.
5. Implement frontend types/api/StageApp/MatchScreen/ResumeScreen changes.
6. Run focused tests, then full backend/frontend/type/build verification.
7. Request code review, fix actionable findings, rerun verification.
8. Commit and push.

## Acceptance

- A saved targeted version is persisted as a generated page version.
- Match history/detail identify the saved page version.
- Resume version history shows the targeted version with role/company context.
- Backend tests, frontend tests, TypeScript, production build, and diff check pass.
