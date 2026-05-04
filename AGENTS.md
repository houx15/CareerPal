# CareerPal Agent Guide

## Product Sources

- Product specification: `docs/SPEC.md`.
- Primary design handoff: `docs/careerpal/project/CareerPal.html`.
- Design bundle entry notes: `docs/careerpal/README.md`.
- Prototype imports to study before frontend work: `i18n.jsx`, `slime.jsx`, `data.jsx`, `intro.jsx`, `auth.jsx`, `screens.jsx`, `match.jsx`, `grow.jsx`, `workspace.jsx`, `tweaks-panel.jsx`, and `styles.css` under `docs/careerpal/project/`.

## Architecture

- Keep frontend and backend as separate applications.
- Frontend target: Next.js / React SPA, deployed independently.
- Backend target: Python + FastAPI REST API, deployed independently.
- Data layer target: PostgreSQL for structured profile data.
- File storage target: Alibaba Cloud OSS for resume uploads and generated exports.
- Realtime conversation transport: SSE.
- LLM integration must stay provider-agnostic through an adapter layer supporting OpenAI-compatible and Anthropic formats.

## Scope Priorities

- Phase 1 is the current product loop: auth, resume upload/parsing, conversational onboarding, structured profile data, profile visualization, generated page preview/hosting, and PDF export.
- The app experience should stay conversation-first. Avoid dashboards, global sidebars, or form-heavy flows unless explicitly requested.
- The generated profile page is an interactive resume, not a general website builder.

## Frontend Notes

- Recreate the design handoff faithfully in production components rather than copying prototype structure blindly.
- Preserve the visual direction: light, focused, Stripe/Apple-inspired UI with the companion/chat surface as the primary interaction.
- The prototype currently includes intro, auth/name onboarding, workspace, match, grow, personal space, settings, i18n, and companion visual assets.
- Do not render or screenshot the design handoff unless specifically useful for implementation verification.

## Backend Notes

- Model the schema from `docs/SPEC.md` around users, profiles, education, experience, projects, skills, certificates, conversations, generated pages, and resume files.
- Conversation endpoints should load profile context, stream model output, then run extraction/reconciliation to update structured profile data.
- Resume parsing pipeline: upload, store object, extract text from PDF/DOCX, structure via LLM, persist normalized profile entities.

## TDD Workflow

- Use test-driven development for feature work and bug fixes.
- No production behavior changes without a failing test first.
- Tests should verify observable behavior, not internal wiring. Mock only external boundaries when necessary.
- Complete work in small batches: failing test, minimal implementation, passing test, refactor while green.
- Expected test commands after scaffolding:
  - Frontend: `cd frontend && pnpm test --run`
  - Backend: `cd backend && pytest`
  - Full suite: `cd frontend && pnpm test --run && cd ../backend && pytest`

## Completion Checks

- Run the relevant focused tests first.
- Before calling work complete, run the full available test suite for every touched app.
- If a required frontend or backend test command is not available yet, state that clearly and explain what is missing.
