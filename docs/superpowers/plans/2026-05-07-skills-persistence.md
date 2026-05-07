# CareerPal Skills Persistence Plan

## Context

CareerPal is in Milestone 1: Profile Workspace Persistence. Completed profile sections already persist basics, contact fields, education, experience, and projects. This slice adds skills while preserving the design bundle's skill-card interaction and using the spec fields from `docs/SPEC.md`.

Primary sources:
- Spec: `docs/SPEC.md`, Skill table: `name`, `category`, `proficiency`, `comment`.
- Design: `docs/careerpal/project/workspace.jsx`, `screens.jsx`, `data.jsx`.
- Existing patterns: project persistence in `backend/app/api/profile.py`, `backend/app/models/user.py`, `backend/app/schemas/profile.py`, `frontend/src/components/workspace/*`.

## Current Position

Roadmap position: Milestone 1, Slice 1.2: Skills Persistence.

Already complete:
- Walking skeleton
- Design-faithful frontend shell
- Auth/register/login
- Profile basics/contact persistence
- Education persistence
- Experience persistence
- Projects persistence

After this slice, Milestone 1 will still have:
- Slice 1.3 Certificates Persistence
- Slice 1.4 Profile Completeness Contract

## Data Contract

Backend `Skill` fields:
- `id`: UUID string primary key
- `profile_id`: FK to `profiles.id`
- `name`: string, required
- `category`: string, required
- `proficiency`: one of `beginner`, `intermediate`, `advanced`, `expert`
- `comment`: nullable text
- `sort_order`: integer for stable replacement ordering, following education/experience/project patterns

Profile API:
- `GET /api/profile` includes `skills: SkillItem[]`
- `PATCH /api/profile` accepts `skills: SkillItem[]` and replaces the user's skill list
- `GET /api/profile/completeness` includes `sections.skills`

Completeness rules for this slice:
- `empty`: no skill rows
- `complete`: at least one skill has non-empty `name`, non-empty `category`, and a valid proficiency
- `partial`: skill rows exist but none are complete

Frontend mapping:
- Existing design shows skill pills in the card. Keep that visual pattern.
- Existing drawer card pattern is preserved, but fields become Skill name, Category, Proficiency, Comment.
- Persisted skills replace demo skills after login/reload.
- Local saved skills should update the card immediately after save.

## Task 1: Backend Skills Persistence

Ownership: backend only.

Files:
- `backend/app/models/user.py`
- `backend/app/schemas/profile.py`
- `backend/app/api/profile.py`
- `backend/alembic/versions/0007_skill_items.py`
- `backend/tests/test_profile.py`

TDD RED tests first:
- Add a profile test proving `PATCH /api/profile` with `skills` persists and `GET /api/profile` returns ordered skills.
- Add a profile completeness test proving empty, partial, and complete skill section states.
- Run the specific backend test file and confirm it fails because `skills` is not accepted/persisted yet.

Implementation:
- Add `Skill` model and `Profile.skill_items` relationship.
- Add migration `0007_skill_items.py`.
- Add `SkillItem` and `SkillItemUpdate` schemas with `Literal["beginner", "intermediate", "advanced", "expert"]`.
- Replace `skills: list[dict]` in `ProfileResponse` with `list[SkillItem]`.
- Add `skills` to `ProfileUpdate`.
- Update `_profile_response`, `update_profile`, and completeness logic.

Verification:
- `cd backend && alembic upgrade head && python3 -m pytest backend/tests/test_profile.py` from repo root is wrong because of cwd; use `cd backend && alembic upgrade head && python3 -m pytest tests/test_profile.py`.
- Then run `cd backend && python3 -m pytest`.

## Task 2: Frontend Skills Wiring

Ownership: frontend only.

Files:
- `frontend/src/lib/types.ts`
- `frontend/src/fixtures/careerpalDemoData.ts`
- `frontend/src/components/workspace/Workspace.tsx`
- `frontend/src/components/workspace/ProfileDashboard.tsx`
- `frontend/src/components/workspace/WorkspaceOverlays.tsx`
- `frontend/src/components/Workspace.test.tsx`
- `frontend/src/components/StageApp.test.tsx`

TDD RED tests first:
- Add a workspace test proving the Skills drawer sends a `skills` payload with `name`, `category`, `proficiency`, and trimmed `comment`.
- Add a workspace test proving persisted partial skills render in the Skills card after login/reload.
- Add a StageApp test proving persisted skills returned by the backend adapter appear after login.
- Run the targeted frontend tests and confirm failure because skills are not wired yet.

Implementation:
- Add `SkillItem` type and include `skills` in `ProfilePatch`.
- Make demo data compatible with the spec fields while preserving existing visual data, mapping older `years/level` only as optional demo-only values if needed.
- In `Workspace`, merge saved/persisted skills like projects and compute local state after save.
- In `ProfileDashboard`, continue rendering skill pills; include category/proficiency only if it fits without breaking the design language.
- In `EditDrawer`, replace the fallback basics form for `skills` with skill-specific fields and add/remove behavior.
- In `profilePatchForSection`, return normalized `skills`.

Verification:
- `cd frontend && npm test -- --run src/components/Workspace.test.tsx src/components/StageApp.test.tsx`
- `cd frontend && npm test -- --run`
- `cd frontend && npx tsc --noEmit`
- `cd frontend && npm run build`

## Task 3: Integration, Review, And Commit

Ownership: controller.

Steps:
- Update `docs/superpowers/plans/2026-05-07-careerpal-master-roadmap.md` so Projects is marked complete and Skills is current.
- Run full backend and frontend verification.
- Run proxy API E2E for skills through the frontend `/api` proxy if local servers are available.
- Remove generated caches such as `__pycache__` and `frontend/tsconfig.tsbuildinfo`.
- Request code review.
- Fix any Critical or Important findings with failing tests first.
- Commit with `feat: persist skill profile items`.

No third-party secrets are needed for this slice.
