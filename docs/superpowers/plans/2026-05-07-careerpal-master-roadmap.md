# CareerPal Master Roadmap

> **For agentic workers:** This is the product-level roadmap. Do not execute it directly as one large plan. For each slice, create a separate detailed TDD implementation plan under `docs/superpowers/plans/YYYY-MM-DD-<slice>.md`, then execute with `superpowers:subagent-driven-development`.

**Goal:** Build CareerPal step by step from the current walking skeleton into the Phase 1 product loop, then extend into Match and Grow.

**Primary Sources:**
- Product spec: `docs/SPEC.md`
- Design bundle: `docs/careerpal`
- Primary design entrypoint: `docs/careerpal/project/CareerPal.html`
- Core design files: `auth.jsx`, `workspace.jsx`, `screens.jsx`, `match.jsx`, `grow.jsx`, `styles.css`

**Process Rules:**
- Use TDD for every implementation slice: failing test first, minimal production change, pass, refactor only after green.
- Follow `docs/careerpal` interaction flow and page design strictly unless a specific point is technically impossible or conflicts with the product spec.
- Use subagent-driven development for each non-trivial slice: backend worker, frontend worker, spec/design reviewer, quality reviewer.
- Ask the user before using secrets or third-party services: LLM provider keys, OSS credentials, deployment credentials, domain/DNS access, email/SMS providers.
- Keep each slice independently verifiable and commit/push after a green verification gate.

---

## Current State

The app already has a separated Next.js frontend and FastAPI backend. The design-faithful frontend shell exists, and profile workspace persistence has started.

Completed slices:
- Walking skeleton
- Design-faithful frontend shell
- Auth/register/login basics
- Profile basics persistence
- Contact fields persistence
- Education persistence
- Experience persistence
- Projects persistence
- Skills persistence
- Certificates persistence
- Profile completeness contract

Known verification status:
- Backend unit tests passed after the certificates slice.
- Frontend unit tests, TypeScript, and production build passed after the certificates slice.
- Proxy API E2E passed for certificates persistence.
- Full browser UI E2E is still blocked by local Playwright/browser-install environment issues.

---

## Milestone 1: Profile Workspace Persistence

**Purpose:** Finish the structured profile data foundation used by the workspace visualization, onboarding extraction, page generation, Match, and Grow.

**Design source:** `docs/careerpal/project/workspace.jsx`, `docs/careerpal/project/screens.jsx`, `docs/careerpal/project/data.jsx`, `docs/careerpal/project/styles.css`

### Slice 1.1: Projects Persistence

**Status:** Complete.

**Scope:**
- Add backend `Project` model/table/migration.
- Add project schema fields from `docs/SPEC.md`: `name`, `description`, `tech_stack`, `achievements`, `link`, `comment`, `completeness`, `sort_order`.
- Add `projects` to `GET /api/profile`, `PATCH /api/profile`, and `/api/profile/completeness`.
- Wire frontend workspace card/drawer to persisted projects while preserving the design bundle interaction.
- Add StageApp coverage so persisted projects render after login/reload.

**Acceptance:**
- New account can save, reload, edit, and remove projects.
- Completeness reports project status.
- Backend tests, frontend tests, TypeScript, build, and proxy API E2E pass.

### Slice 1.2: Skills Persistence

**Status:** Complete.

**Scope:**
- Add backend `Skill` model/table/migration.
- Fields: `name`, `category`, `proficiency`, `comment`.
- Add skills to profile response/update and completeness.
- Wire frontend skill card/drawer to persisted skills.
- Preserve design language for skill grouping and proficiency display.

**Acceptance:**
- User can persist grouped skills and proficiency.
- Skills appear in workspace and remain after reload.
- Completeness updates correctly.

### Slice 1.3: Certificates Persistence

**Status:** Complete.

**Scope:**
- Add backend `Certificate` model/table/migration.
- Fields: `name`, `issuer`, `date`, `comment`.
- Add certificates to profile response/update and completeness.
- Wire frontend certificate card/drawer.

**Acceptance:**
- User can save, edit, remove, and reload certificates.
- Certificates participate in completeness.

### Slice 1.4: Profile Completeness Contract

**Status:** Complete.

**Scope:**
- Normalized completeness rules for basics, contact, summary, education, experience, projects, skills, certificates.
- Ensured frontend node/card states map consistently to backend values for persisted sections.
- Added tests for empty, sparse/partial, and complete examples.

**Acceptance:**
- Workspace visualization reflects backend completeness deterministically.
- No frontend-only fake completeness remains for persisted sections.

---

## Milestone 2: Conversational Onboarding And Extraction

**Purpose:** Move from form-like persistence toward the spec's core value loop: conversation creates structured profile data.

**Design source:** `docs/careerpal/project/auth.jsx`, `docs/careerpal/project/slime.jsx`, `docs/careerpal/project/styles.css`

### Slice 2.1: Conversation Data Model

**Scope:**
- Add `Conversation` table/model.
- Fields: `user_id`, `context_type`, `messages`, `focus_node`, `created_at`, `updated_at`.
- Add endpoints for start, history, and fetching one conversation.

**Acceptance:**
- User can start career/page conversations and retrieve persisted history.
- Tests cover user isolation and context type validation.

### Slice 2.2: Conversation UI Persistence

**Scope:**
- Connect design-bundle conversation screens to backend conversation sessions.
- Persist messages locally through API calls.
- Maintain design-bundle interaction patterns: AI speaks first, upload/no-resume choices, mixed option/text input.

**Acceptance:**
- Refresh does not lose conversation history.
- Node/focus changes create or resume the correct focused conversation.

### Slice 2.3: LLM Provider Abstraction

**Scope:**
- Add provider-agnostic LLM adapter for OpenAI-compatible and Anthropic-compatible formats.
- Add config validation without hardcoding secrets.
- Add fake provider for tests.

**Secrets needed:** User must provide model provider choice, base URL if not default, model name, and API key.

**Acceptance:**
- Tests can stream deterministic fake responses.
- Production config fails clearly when required LLM settings are missing.

### Slice 2.4: Streaming Career Conversation

**Scope:**
- Implement `/api/conversation/message` with SSE.
- Load current profile into prompt context.
- Stream model response to frontend.
- Preserve design-bundle typing/agent state behavior.

**Acceptance:**
- User sends a message and sees streamed assistant response.
- Tests cover auth, session ownership, and fake streaming behavior.

### Slice 2.5: Light Extraction

**Scope:**
- Add extraction prompt and fake extraction test adapter.
- After assistant response completes, extract explicit profile updates from recent messages.
- Apply extracted changes to profile tables.
- Return extraction diff for visualization updates.

**Acceptance:**
- Explicit user statements update profile data.
- Tests prove the extractor does not infer or fabricate unstated data.

### Slice 2.6: End-Of-Session Reconciliation

**Scope:**
- Add reconciliation job/service that reviews conversation history and current profile.
- Apply corrections and richer structured updates.
- Keep conflict behavior deterministic and testable.

**Acceptance:**
- Later corrections overwrite earlier profile data only when explicitly stated.
- Reconciliation is idempotent.

---

## Milestone 3: Resume Upload And Parsing

**Purpose:** Implement Path A from the spec: user has a resume, uploads it, then AI confirms and fills gaps.

**Design source:** `docs/careerpal/project/auth.jsx`

### Slice 3.1: Local Resume Upload

**Scope:**
- Add `ResumeFile` model/table.
- Implement upload endpoint with local development storage first.
- Accept PDF and DOCX with size/type validation.

**Acceptance:**
- Authenticated user can upload supported files.
- Unsupported types and oversized files return clear errors.

### Slice 3.2: Text Extraction

**Scope:**
- Extract PDF text with `pymupdf`.
- Extract DOCX text with `python-docx`.
- Store parsed text or structured intermediate result.

**Acceptance:**
- Tests cover fixture PDF/DOCX extraction.
- Empty or unreadable files produce actionable errors.

### Slice 3.3: Resume Structuring

**Scope:**
- Use LLM abstraction to convert resume text into profile entities.
- Apply structured data to profile tables.
- Start follow-up conversation focused on missing/vague sections.

**Secrets needed:** LLM credentials if not already configured.

**Acceptance:**
- Fake LLM tests prove parsed profile data is persisted.
- UI shows confirmation and follow-up questions per design.

### Slice 3.4: OSS Storage

**Scope:**
- Replace or supplement local resume storage with Alibaba Cloud OSS.
- Store originals under the spec's `careerpal-bucket/resumes/{user_id}/` structure.

**Secrets needed:** Alibaba Cloud OSS endpoint, bucket, access key, secret key.

**Acceptance:**
- Upload stores object in OSS in production config.
- Tests continue to use local/fake storage.

---

## Milestone 4: Interactive Page Generation And Export

**Purpose:** Complete Phase 1's output loop: structured profile becomes a hosted interactive page and ATS-friendly export.

**Design source:** `docs/careerpal/project/screens.jsx`, `docs/careerpal/project/workspace.jsx`, `docs/careerpal/project/styles.css`

### Slice 4.1: Page Data Model

**Scope:**
- Add `GeneratedPage` model/table.
- Fields: `html_content`, `style_template`, `version`, `is_public`, `created_at`.
- Add version listing and latest preview endpoints.

**Acceptance:**
- User can retrieve latest page and version history.

### Slice 4.2: Template-Based Page Generation

**Scope:**
- Add three style template references: clean professional, modern creative, technical.
- Generate complete HTML/CSS from current profile via LLM abstraction.
- Save generated version.

**Secrets needed:** LLM credentials if not already configured.

**Acceptance:**
- Fake provider tests verify only profile-backed content appears.
- Empty sections are omitted.

### Slice 4.3: Page Preview And Customization Chat

**Scope:**
- Connect preview UI to generated page endpoint.
- Add page conversation context for customization.
- Regenerate page versions from customization instructions.

**Acceptance:**
- User can preview and request style/content emphasis changes.
- Page conversation remains separate from career conversation.

### Slice 4.4: Public Page Hosting

**Scope:**
- Implement `/p/{username}` or equivalent route.
- Enforce public/private setting.
- Add public preview tests.

**Acceptance:**
- Public pages are viewable without auth only when enabled.
- Private pages reject anonymous access.

### Slice 4.5: PDF Export

**Scope:**
- Render structured profile into ATS-friendly resume format.
- Add download endpoint.
- Store exports under the spec's export path when OSS is configured.

**Acceptance:**
- User can download a generated PDF.
- Tests cover content inclusion and auth.

---

## Milestone 5: Match

**Purpose:** Implement Phase 2: JD analysis, match score, gaps, and targeted resume suggestions.

**Design source:** `docs/careerpal/project/match.jsx`, `docs/careerpal/project/data.jsx`

### Slice 5.1: JD Input And History

**Scope:**
- Add job description analysis model/table.
- Persist JD text, company/role if detected, score, strengths, gaps, suggestions.
- Wire Match entry screen to backend history.

**Acceptance:**
- User can paste a JD and see it in history after analysis.

### Slice 5.2: Match Analysis

**Scope:**
- Use LLM abstraction to analyze current profile against JD.
- Return match score, strengths, gaps, and suggested profile/resume adjustments.
- Preserve design-bundle radar/result presentation.

**Secrets needed:** LLM credentials if not already configured.

**Acceptance:**
- Fake provider tests verify deterministic analysis storage.
- UI renders result using persisted backend data.

### Slice 5.3: Save Targeted Resume Version

**Scope:**
- Allow match suggestions to produce a saved resume/page version for a target JD.
- Link saved versions to match history.

**Acceptance:**
- Saved targeted version appears in resume/version history.

---

## Milestone 6: Grow

**Purpose:** Implement Phase 3: turn gaps into a skill tree/growth roadmap and update the profile as the student progresses.

**Design source:** `docs/careerpal/project/grow.jsx`, `docs/careerpal/project/data.jsx`

### Slice 6.1: Growth Plan Data Model

**Scope:**
- Add growth plan/tree models or JSON-backed plan storage.
- Persist goal, nodes, states, quality/progress, parent-child relationships.

**Acceptance:**
- Grow screen can load a persisted tree instead of demo data.

### Slice 6.2: Generate Growth Roadmap

**Scope:**
- Generate roadmap from match gaps and current profile.
- Include actionable steps, dependencies, locked/active/done states.

**Secrets needed:** LLM credentials if not already configured.

**Acceptance:**
- Fake provider tests verify generated tree persistence.
- UI follows design-bundle tree behavior.

### Slice 6.3: Improve And Log Progress

**Scope:**
- Persist node improvement chat/results.
- Let user log evidence/progress.
- Reflect progress back into profile comments/skills where appropriate.

**Acceptance:**
- Logged progress survives reload and updates node quality/state.

---

## Milestone 7: Production Hardening

**Purpose:** Make the product reliable enough for real users and deployment.

### Slice 7.1: Error, Loading, And Empty States

**Scope:**
- Audit all design-bundle screens against real API failures/loading/empty states.
- Add tests for auth expiration, network failure, empty profile, and invalid payloads.

**Acceptance:**
- UI fails clearly without breaking layout.

### Slice 7.2: Full Browser E2E

**Scope:**
- Restore Playwright/browser environment.
- Add browser tests for auth, workspace persistence, conversation, page generation, match, and grow as slices land.

**Acceptance:**
- E2E suite can run locally and in CI.

### Slice 7.3: Deployment Configuration

**Scope:**
- Add production environment docs/config for separated frontend/backend deployment.
- Configure database migrations, CORS, API base URL, process management, and reverse proxy assumptions.

**Secrets needed:** Deployment target details, database URL, domain/DNS access, OSS credentials, LLM credentials.

**Acceptance:**
- Fresh environment can deploy from documented steps.

---

## Recommended Execution Order

1. Finish Milestone 1 fully: Projects, Skills, Certificates, completeness contract.
2. Build Milestone 2 conversation persistence before LLM streaming, so the UI can be tested without third-party services.
3. Add LLM abstraction with fake-provider tests before any real provider integration.
4. Implement Resume Upload after the conversation/profile pipeline exists, because parsed resumes feed the same tables.
5. Implement Page Generation and Export to complete Phase 1.
6. Implement Match.
7. Implement Grow.
8. Harden deployment and browser E2E continuously, with final focused cleanup in Milestone 7.

## Next Slice

Create and execute a detailed TDD plan for:

`docs/superpowers/plans/2026-05-07-skills-persistence.md`

Use subagent-driven development with:
- Backend worker: model, migration, schema, API, backend tests.
- Frontend worker: types, workspace card/drawer wiring, StageApp tests.
- Spec/design reviewer: compare against `docs/SPEC.md` and `docs/careerpal`.
- Quality reviewer: test quality, edge cases, integration leaks, generated artifacts.
