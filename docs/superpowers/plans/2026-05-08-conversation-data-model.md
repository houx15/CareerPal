# Conversation Data Model Slice Plan

## Context

Milestone 2 moves CareerPal from profile forms toward the spec's core conversation-led workflow. Slice 2.1 establishes the persisted conversation contract before LLM streaming or design-screen persistence.

Existing code already has a `Conversation` model, `/api/conversation/start`, and placeholder `/api/conversation/message`. This slice closes the roadmap acceptance gap by adding history/detail retrieval, tightening response metadata, and exposing the thin frontend API methods needed by the next UI slice.

## Scope

- Backend endpoints:
  - `POST /api/conversation/start`
  - `GET /api/conversation/history`
  - `GET /api/conversation/{id}`
- Persist and return:
  - `id`
  - `context_type` (`career` or `page`)
  - `focus_node`
  - `messages`
  - `created_at`
  - `updated_at`
- Frontend API client helpers:
  - `listConversations()`
  - `getConversation(id)`

## Out Of Scope

- Streaming `/api/conversation/message` behavior beyond the existing placeholder.
- LLM provider integration or secrets.
- Conversation UI persistence in `docs/careerpal` screens.
- Extraction from messages into profile tables.

## TDD Plan

1. Add backend tests for:
   - `GET /api/conversation/history` returns only the current user's conversations, newest first, with timestamps.
   - `GET /api/conversation/{id}` returns the full persisted conversation for the owner.
   - `GET /api/conversation/{id}` returns `404` for another user's conversation.
   - Invalid `context_type` is rejected by the existing request schema.
2. Run the backend conversation tests and confirm the new endpoint tests fail because routes are missing.
3. Add frontend API tests for:
   - `listConversations()` calls `/api/conversation/history` with bearer auth.
   - `getConversation(id)` calls `/api/conversation/{id}` with bearer auth.
4. Run the frontend API test and confirm it fails because methods are missing.
5. Implement the smallest backend and frontend changes to pass.
6. Run focused tests, then the full backend and frontend verification commands.

## Acceptance

- A user can start both career and page conversations and retrieve them through history.
- A user can fetch one owned conversation with full messages and metadata.
- Conversation retrieval is isolated per user.
- Invalid context types are rejected.
- No third-party secrets are required for this slice.
