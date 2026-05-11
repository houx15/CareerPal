# Slice 5.2: Match Analysis

## Goal

Use the existing LLM abstraction to analyze the current persisted profile against a pasted job description, then store and render the returned score, strengths, gaps, and suggested resume/profile adjustments.

## Sources

- Product spec: `docs/SPEC.md`, Phase 2 Match
- Roadmap: `docs/superpowers/plans/2026-05-07-careerpal-master-roadmap.md`, Slice 5.2
- Design bundle: `docs/careerpal/project/match.jsx`
- Existing implementation: `backend/app/services/llm.py`, `backend/app/services/match_analysis.py`, `backend/app/api/match.py`, `frontend/src/components/workspace/MatchScreen.tsx`

## Scope

- Backend match analysis uses `build_llm_client(get_settings())`.
- Prompt includes the current profile context and pasted JD.
- LLM output is constrained to JSON with `company`, `role`, `score`, `strengths`, `gaps`, and `suggestions`.
- Fake-provider tests prove deterministic analysis storage without network access.
- Invalid or malformed provider output returns a clear API error and does not persist a partial analysis.
- Match result keeps design-bundle result structure, including a radar-style score visualization.

## Out Of Scope

- Targeted saved resume/page versions. That is Slice 5.3.
- Growth roadmap generation. That starts in Milestone 6.
- New third-party credentials. The user has already placed LLM settings in `.env`; tests stay fake/mocked.

## TDD Plan

1. Add backend tests that monkeypatch the LLM client:
   - successful JSON analysis is parsed, bounded, persisted, and shown in history/detail.
   - prompt includes profile data and JD.
   - malformed JSON returns a 502-style provider error and does not add history.
2. Add frontend test for the Match result radar presentation using backend analysis data.
3. Run the focused tests and confirm they fail for the expected reasons.
4. Implement minimal backend parsing/prompting and error handling.
5. Implement the minimal frontend radar visualization if the test requires it.
6. Run focused tests, then full backend and frontend gates.
7. Request code review, fix actionable findings, rerun verification.
8. Commit and push.

## Acceptance

- `POST /api/match/analyze` persists LLM-derived fields when provider output is valid.
- Provider failures or malformed structured output are surfaced clearly and do not create match history rows.
- The Match UI renders persisted backend data in a result page with the design-bundle score/radar presentation.
- Backend tests, frontend tests, TypeScript, production build, and `git diff --check` pass.
