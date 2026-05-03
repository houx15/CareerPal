# CareerPal Walking Skeleton Design

## Context

CareerPal is an AI-powered career companion for students. The product specification in `docs/SPEC.md` defines Phase 1 as a complete value loop: conversational onboarding, structured profile data, an interactive personal page, and PDF export.

The design bundle in `docs/careerpal/project/` is the baseline for user flow and product behavior. The first implementation must preserve the sequence and interaction model from that bundle unless a feature is explicitly phased behind a stable placeholder contract.

## Milestone Goal

Build a working local walking skeleton with separated frontend and backend applications. The slice proves the main product flow end-to-end with real account and profile persistence, while keeping AI, resume parsing, page generation, match, and grow features behind tested placeholder contracts.

## Non-Goals

- Full LLM integration.
- Resume PDF/DOCX text extraction.
- Alibaba Cloud OSS integration.
- Real generated HTML page hosting.
- Production PDF export.
- Production deployment configuration.
- Pixel-perfect migration of every prototype screen.

These are deferred so the first milestone can establish architecture, contracts, testing, and the polished user flow without building unstable feature depth prematurely.

## Architecture

The repository will contain two separate applications:

- `frontend/`: Next.js React SPA.
- `backend/`: Python FastAPI REST API.

The frontend talks to the backend over HTTP using `/api/...` endpoints. The backend owns authentication, profile persistence, and placeholder contracts for future modules. Database models are PostgreSQL-compatible from day one, with fast local tests allowed to use SQLite where behavior is equivalent.

## Backend Design

### Stack

- FastAPI for HTTP routing.
- SQLAlchemy for ORM models.
- Alembic for migrations.
- Password hashing for persisted credentials.
- Token-based authentication for frontend sessions.
- Pytest plus FastAPI test client for behavior tests.

### Core Entities

The first milestone implements the minimum real subset of the specification:

- `User`
  - `id`
  - `email`
  - `username`
  - `password_hash`
  - `created_at`
  - `updated_at`
- `Profile`
  - `id`
  - `user_id`
  - `name`
  - `headline`
  - `target_direction`
  - `comment`
  - `created_at`
  - `updated_at`
- `Conversation`
  - `id`
  - `user_id`
  - `context_type`
  - `focus_node`
  - `messages`
  - `created_at`
  - `updated_at`

Detailed education, experience, project, skill, certificate, generated page, and resume file tables are deferred until their feature slice. The first profile response can expose empty arrays for these sections so the frontend contract already matches the Phase 1 shape.

### API Contracts

Auth:

- `POST /api/auth/register`
  - Creates a user and an empty profile.
  - Rejects duplicate email or username.
  - Returns an access token and user object.
- `POST /api/auth/login`
  - Verifies email and password.
  - Returns an access token and user object.
- `GET /api/auth/me`
  - Requires auth.
  - Returns the current user.

Profile:

- `GET /api/profile`
  - Requires auth.
  - Returns the user's profile plus empty structured section arrays.
- `PATCH /api/profile`
  - Requires auth.
  - Updates first-milestone profile fields: `name`, `headline`, `target_direction`, and `comment`.
- `GET /api/profile/completeness`
  - Requires auth.
  - Returns section states for visualization. Empty new profiles mark most sections as `empty` and basics as `partial` once a name exists.

Conversation:

- `POST /api/conversation/start`
  - Requires auth.
  - Accepts `context_type` of `career` or `page` and optional `focus_node`.
  - Creates a conversation row and returns it.
- `POST /api/conversation/message`
  - Requires auth.
  - Accepts a conversation id and user message.
  - Appends the user message and returns a deterministic placeholder assistant response.
  - If the message is part of onboarding and contains basic profile fields supported by the milestone, updates the profile only through explicit fields submitted by the frontend, not free-text inference.

Placeholder module contracts:

- The frontend may call lightweight health or preview endpoints for resume, page, match, and grow screens only when needed for flow continuity.
- Placeholder responses must be deterministic and explicitly marked as not AI-generated.

## Frontend Design

### Stack

- Next.js with React.
- TypeScript.
- Component tests around stage transitions, forms, API client behavior, and authenticated workspace rendering.
- The first implementation should reuse design tokens and interaction flow from the prototype, while production components can be smaller and more maintainable than the prototype files.

### Flow

The production app preserves the design bundle sequence:

1. `intro`
2. `login`
3. `signup`
4. `name`
5. `onboarding`
6. `workspace`

Registration should land in the name step. Submitting the name updates the backend profile, then opens onboarding. Login for an existing user should fetch profile state and enter workspace.

### Screens

Intro:

- Presents CareerPal and entry actions.
- Uses the design bundle's brand direction and high-level composition.

Signup/Login:

- Use real backend register/login endpoints.
- Store access token client-side for local development.
- Show validation errors from backend in the form.

Name:

- Collects the display name after signup.
- Calls `PATCH /api/profile`.

Onboarding:

- Follows the prototype's conversational onboarding pattern.
- Uses deterministic local prompts and backend conversation placeholder responses.
- Allows the user to continue to workspace once baseline profile setup is complete.

Workspace:

- Fetches `GET /api/profile` and `GET /api/profile/completeness`.
- Shows the chat column and profile/completeness side panel matching the design direction.
- Match, grow, and personal page areas may appear as shell views if already present in the design flow, but their data remains placeholder-backed.

## Testing Strategy

Development follows strict TDD:

- Write a failing behavior test before production behavior.
- Run the focused test and confirm the expected failure.
- Implement the smallest code needed to pass.
- Run the focused test and then the relevant app suite.
- Refactor only while tests are green.

Backend tests verify observable API behavior:

- Register creates user and profile.
- Duplicate email and username are rejected.
- Login returns a usable token.
- `/api/auth/me` rejects missing auth and returns current user with auth.
- Profile patch persists allowed fields.
- Completeness reflects profile state.
- Conversation start persists context.
- Conversation message appends messages and returns deterministic placeholder output.

Frontend tests verify observable user behavior:

- Intro routes to signup and login stages.
- Signup success moves to name stage.
- Name submission persists profile and moves to onboarding.
- Existing login enters workspace.
- Workspace renders profile/completeness returned by the API client.
- API client attaches the auth token and surfaces backend errors.

## Acceptance Criteria

- `frontend/` and `backend/` exist as separate runnable applications.
- Backend has real auth/profile persistence with migrations.
- Frontend preserves the approved design-bundle flow.
- A new user can register, set a name, complete the initial onboarding transition, and reach workspace locally.
- An existing user can log in and return to workspace.
- Workspace loads profile and completeness data from the backend.
- Placeholder AI/conversation behavior is deterministic and clearly scoped.
- Focused and full available tests pass for touched apps.

## Deferred Notes

- Resume upload/parsing should become the next backend-heavy slice after the skeleton.
- Pixel-perfect frontend migration should proceed screen-by-screen once the skeleton flow is stable.
- SSE streaming should be introduced with the real conversation/LLM slice.
- PostgreSQL should be used for development and deployment once Docker or local database setup is defined.
