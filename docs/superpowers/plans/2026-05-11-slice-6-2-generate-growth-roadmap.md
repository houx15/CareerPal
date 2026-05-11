# Slice 6.2: Generate Growth Roadmap

## Goal

Generate a persisted growth skill tree from a saved job match and the current profile, then let the user trigger it from the Match result and see the generated tree on Grow.

## Scope

- Add a backend generation service that asks the configured LLM for a JSON growth plan.
- Validate generated output with the existing growth plan schema and tree-integrity rules.
- Add `POST /api/growth/plan/generate` with auth and current-user match ownership checks.
- Persist generated output as the user's current growth plan.
- Add frontend API and StageApp/Workspace wiring.
- Add a design-faithful Match result action that generates the roadmap and navigates to Grow.

## Out Of Scope

- Node popovers, improve chat, unlock/fork persistence, and progress logging. Those belong to Slice 6.3.
- Multi-plan history. Slice 6.2 replaces the current plan, consistent with Slice 6.1 single-plan storage.

## TDD Plan

1. Backend red tests:
   - generation requires auth.
   - current user can generate a plan from their match; fake LLM response persists and can be loaded with `GET /growth/plan`.
   - another user's match id returns 404.
   - malformed LLM roadmap returns 502 and does not replace the existing plan.
2. Frontend red tests:
   - API client posts `match_analysis_id` to `/api/growth/plan/generate`.
   - StageApp Match result action calls generation, updates Grow, and navigates to the generated tree.
   - Workspace Match result renders the design action and calls the callback.
3. Implementation:
   - Add schema request/response types.
   - Add growth roadmap service with strict JSON extraction/cleaning.
   - Add backend route and persistence helper reuse.
   - Add frontend types/API and Match/Workspace/StageApp wiring.
4. Review and verification:
   - Run focused backend/frontend tests while implementing.
   - Request subagent code review for the uncommitted diff.
   - Run full backend and frontend gates before commit/push.
