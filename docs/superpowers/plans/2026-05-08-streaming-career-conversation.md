# Streaming Career Conversation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert conversation message sending from placeholder JSON to authenticated SSE streaming backed by the tested LLM abstraction, while preserving current design-bundle chat surfaces.

**Architecture:** Backend `/api/conversation/message` returns `text/event-stream` events: `message` delta events during generation and one `done` event with the persisted conversation response. Frontend `ApiClient.sendMessage` consumes the SSE stream and returns the final response shape that existing StageApp flows already use; later UI work can subscribe to deltas directly without changing the backend contract.

**Tech Stack:** FastAPI `StreamingResponse`, SQLAlchemy, `app.services.llm`, Next.js frontend fetch streaming, Vitest, pytest.

---

## Scope Boundaries

- Use the default fake LLM provider unless real credentials are configured by the user.
- Do not call third-party LLM services in tests.
- Do not implement extraction or profile updates yet; that is Slice 2.5.
- Do not redesign the chat UI; keep the `docs/careerpal` screens and interactions intact.

## Files

- Modify: `backend/app/api/conversation.py`
- Modify: `backend/tests/test_conversation.py`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/api.test.ts`
- Modify: `frontend/src/lib/types.ts` only if a shared SSE event type is useful

## Task 1: Backend SSE Message Endpoint

**Files:**
- Modify: `backend/app/api/conversation.py`
- Test: `backend/tests/test_conversation.py`

- [ ] Write a failing test that posts to `/api/conversation/message` and asserts:
  - status `200`
  - response content type starts with `text/event-stream`
  - stream body contains at least one `event: message`
  - stream body contains `event: done`
  - final `done` payload includes the persisted user and assistant messages

- [ ] Run only that test and confirm it fails because the endpoint currently returns JSON.

- [ ] Implement `StreamingResponse`:
  - Authenticate and verify conversation ownership before opening the stream.
  - Build internal `LLMMessage` prompt context with a career system prompt and current conversation messages.
  - Stream fake/provider chunks as SSE `message` events.
  - After streaming completes, persist user and assistant messages with timestamps.
  - Emit `done` with `{conversation_id, assistant_message, messages}`.

- [ ] Run the targeted backend conversation test and `tests/test_llm.py`.

## Task 2: Backend Ownership And Error Regression

**Files:**
- Modify: `backend/tests/test_conversation.py`
- Modify: `backend/app/api/conversation.py`

- [ ] Update existing message tests from JSON response parsing to SSE parsing.
- [ ] Keep the cross-user ownership test asserting `404`.
- [ ] Add or preserve context validation behavior.
- [ ] Run `cd backend && python3 -m pytest tests/test_conversation.py -q`.

## Task 3: Frontend SSE Client Parsing

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/api.test.ts`

- [ ] Write a failing Vitest case for `ApiClient.sendMessage` where fetch returns a `text/event-stream` body containing `message` and `done` events.
- [ ] Assert it sends auth headers and returns the final done payload.
- [ ] Implement minimal SSE parsing using `response.body.getReader()` and `TextDecoder`.
- [ ] Keep fallback JSON handling if a test uses a JSON response.
- [ ] Run `cd frontend && npm test -- src/lib/api.test.ts --run`.

## Task 4: Integration Verification And Review

**Files:**
- Review all changed files

- [ ] Run backend full suite: `cd backend && python3 -m pytest`.
- [ ] Run frontend suite: `cd frontend && npm test -- --run`.
- [ ] Run frontend typecheck/build:
  - `cd frontend && npx tsc --noEmit`
  - `cd frontend && npm run build`
- [ ] Run hygiene:
  - `git diff --check`
  - `rm -f frontend/tsconfig.tsbuildinfo`
  - `git status -sb`
- [ ] Commit and push:
  - `git add backend/app/api/conversation.py backend/tests/test_conversation.py frontend/src/lib/api.ts frontend/src/lib/api.test.ts docs/superpowers/plans/2026-05-08-streaming-career-conversation.md`
  - `git commit -m "feat: stream career conversation responses"`
  - `git push`

## Self-Review Checklist

- [ ] SSE endpoint is authenticated and conversation ownership remains enforced.
- [ ] Fake provider enables deterministic tests with no secrets.
- [ ] Current design-bundle chat screens still use the same send-message workflow.
- [ ] No extraction/profile mutation beyond message persistence is added.
- [ ] Existing JSON `SendMessageResponse` shape is still available from the final `done` event.
