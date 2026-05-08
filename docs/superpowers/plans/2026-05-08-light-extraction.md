# Light Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply explicit profile updates from recent career conversation turns and return an extraction diff with the streamed conversation `done` event.

**Architecture:** Add a backend extraction service with a deterministic fake/rule adapter for tests and local development. After a career assistant response completes, the conversation endpoint extracts only explicit user-stated profile fields from the current turn, patches the profile tables, and includes a compact `extraction_diff` in the final SSE `done` payload. The UI keeps its current design-bundle flow and can use the diff in later visualization refinement.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic schemas, existing conversation SSE, pytest, Vitest type coverage.

---

## Scope Boundaries

- No third-party LLM calls and no secrets.
- No extraction from assistant text.
- No inferred updates; only explicit user statements.
- No end-of-session reconciliation; that is Slice 2.6.
- Keep the current design-bundle chat surfaces intact.

## Files

- Create: `backend/app/services/extraction.py`
- Modify: `backend/app/api/conversation.py`
- Modify: `backend/app/schemas/conversation.py`
- Modify: `backend/tests/test_conversation.py`
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.test.ts` only if needed for the optional diff contract

## Task 1: Extraction Service

**Files:**
- Create: `backend/app/services/extraction.py`
- Test through `backend/tests/test_conversation.py`

- [ ] Write failing tests that send explicit user statements such as:
  - `My headline is Backend SWE intern.`
  - `My target direction is Platform engineering.`
  - `My location is Austin, TX.`
- [ ] Assert `/api/profile` reflects only those explicit fields after the streamed message completes.
- [ ] Implement a deterministic extractor that recognizes explicit labelled statements and ignores unrelated text.

## Task 2: Conversation Integration And Diff

**Files:**
- Modify: `backend/app/api/conversation.py`
- Modify: `backend/app/schemas/conversation.py`
- Modify: `backend/tests/test_conversation.py`

- [ ] Extend `ConversationMessageResponse` with optional `extraction_diff`.
- [ ] After successful assistant streaming, run extraction for `context_type == "career"` only.
- [ ] Apply extracted basics/contact/summary fields to the current user profile using a fresh DB session in the same assistant-append thread.
- [ ] Include `extraction_diff` in the SSE `done` payload.
- [ ] Add tests proving:
  - explicit fields update and are returned in diff;
  - unstated fields remain unchanged;
  - page conversations do not run career extraction;
  - provider failure does not run extraction.

## Task 3: Frontend Contract

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.test.ts`

- [ ] Add optional `extraction_diff` to `SendMessageResponse`.
- [ ] Update or add an API test showing SSE `done` payloads with `extraction_diff` parse successfully.
- [ ] Do not change visual components yet; existing `StageApp` ignores unknown optional response fields safely.

## Task 4: Review, Verification, Commit

- [ ] Run focused backend tests:
  - `cd backend && python3 -m pytest tests/test_conversation.py tests/test_llm.py -q`
- [ ] Run focused frontend API/type checks:
  - `cd frontend && npm test -- src/lib/api.test.ts --run`
  - `cd frontend && npx tsc --noEmit`
- [ ] Request spec and quality review.
- [ ] Run full gate:
  - `cd backend && python3 -m pytest`
  - `cd frontend && npm test -- --run`
  - `cd frontend && npx tsc --noEmit`
  - `cd frontend && npm run build`
  - `git diff --check`
  - `rm -f frontend/tsconfig.tsbuildinfo`
- [ ] Commit and push:
  - `git add backend/app/services/extraction.py backend/app/api/conversation.py backend/app/schemas/conversation.py backend/tests/test_conversation.py frontend/src/lib/types.ts frontend/src/lib/api.test.ts docs/superpowers/plans/2026-05-08-light-extraction.md`
  - `git commit -m "feat: extract explicit profile updates from conversation"`
  - `git push`

## Self-Review Checklist

- [ ] Extraction is deterministic in tests and requires no secrets.
- [ ] Only explicit user-provided facts update profile data.
- [ ] Existing conversation SSE behavior remains intact.
- [ ] Provider failure preserves the user message but does not mutate profile data.
- [ ] Page conversations are excluded from career extraction.
