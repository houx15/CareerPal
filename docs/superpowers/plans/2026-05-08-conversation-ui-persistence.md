# Conversation UI Persistence Slice Plan

## Context

Slice 2.1 added persisted conversation sessions and retrieval. Slice 2.2 connects the design-bundle conversation surfaces to that backend without introducing LLM streaming yet.

The current UI already matches the design bundle for onboarding and profile-improvement chat, but messages are local component state. `StageApp` also starts a new career conversation whenever the workspace loads, which does not satisfy the resume/reuse behavior needed for refresh and focus changes.

## Scope

- Keep the `docs/careerpal` interaction shape:
  - AI speaks first in onboarding.
  - Upload/text/options stay inline in the chat composer.
  - Profile cards still open edit drawers; "Edit via chat" opens a focused chat overlay.
- Add frontend API orchestration:
  - `StageApp` can list, fetch, start, and send conversation messages.
  - Onboarding creates or resumes a general career conversation after signup/name.
  - Workspace profile improvement creates or resumes focused career conversations.
  - Existing conversation messages hydrate the chat surfaces.
  - User chat sends call `/api/conversation/message` through `ApiClient.sendMessage`.

## Out Of Scope

- SSE streaming.
- Real LLM provider integration.
- Extraction from conversations into profile tables.
- Page customization conversations.
- Automatic auth boot on hard page refresh.

## TDD Plan

1. Add RED tests for `StageApp`:
   - Login/workspace load reuses an existing general career conversation from `listConversations` instead of always starting a new one.
   - Signup/name/onboarding starts a general career conversation before onboarding chat messages are sent.
2. Add RED tests for `Onboarding`:
   - Sending an option calls `onSendMessage` with the user text.
   - Existing conversation messages render in the design-bundle chat stream.
3. Add RED tests for `Workspace` / overlay:
   - Opening "Edit via chat" from a section creates or resumes a focused career conversation for that section.
   - Sending a message in the improve overlay calls the persistence callback.
4. Implement the smallest state/callback wiring to pass.
5. Request review, fix findings, then run focused and full verification.

## Acceptance

- Refresh/reload-style remounts can hydrate chat history from persisted backend conversations when the app has an authenticated session.
- General onboarding/workspace career chat reuses existing general career conversations.
- Section-focused chat creates or resumes the correct `focus_node`.
- Design-bundle chat UI remains visually and behaviorally intact.
