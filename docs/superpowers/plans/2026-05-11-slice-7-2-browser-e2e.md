# Slice 7.2 Browser E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a runnable browser E2E harness and cover CareerPal's core authenticated workspace shell in a real browser.

**Architecture:** Add Playwright to the frontend only. Use route interception for deterministic backend responses so the E2E suite can run locally and in CI without starting the backend or needing secrets. Keep the first test narrow: login, workspace load, and navigation across main screens.

**Tech Stack:** Playwright, Next.js dev server, TypeScript.

---

## Scope

- Add Playwright dependency and config under `frontend`.
- Add `npm run test:e2e`.
- Add one deterministic browser test that:
  - opens the app,
  - signs in,
  - mocks backend API responses,
  - verifies the workspace loads,
  - navigates Resume, Match, Grow, and Activity.
- Document how to install browser binaries if the local environment lacks them.

## Files

- Modify: `.gitignore`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/vitest.config.ts`
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/README.md`
- Create: `frontend/e2e/careerpal.spec.ts`

## Task 1: Install And Configure Playwright

- [x] Add `@playwright/test` to frontend dev dependencies.
- [x] Add scripts:
  - `"test:e2e": "playwright test"`
  - `"test:e2e:install": "playwright install --with-deps chromium"`
- [x] Create `frontend/playwright.config.ts` with:
  - `testDir: "./e2e"`
  - local Next dev server on port `3100`
  - Chromium project
  - trace on first retry
- [x] Run `npm run test:e2e` and confirm it reaches browser launch; this host is blocked by missing Chromium system library `libnspr4.so`.

## Task 2: Authenticated Workspace Smoke Test

- [x] Create `frontend/e2e/careerpal.spec.ts`.
- [x] Mock API routes for:
  - `POST /api/auth/login`
  - `GET /api/profile`
  - `GET /api/profile/completeness`
  - `GET /api/conversation/history`
  - `POST /api/conversation/start`
  - `GET /api/page/preview`
  - `GET /api/page/versions`
  - `GET /api/growth/plan`
  - `GET /api/match/history`
- [x] Test signs in and confirms:
  - profile dashboard appears,
  - Resume screen opens,
  - Match screen opens,
  - Grow screen renders mocked growth plan,
  - Activity screen opens.
- [x] Run `npx playwright test --list` and confirm 1 Chromium test is discovered.
- [x] Run `npm run test:e2e`; blocked by host OS dependency `libnspr4.so`, not by test collection or app startup.

## Task 3: Review And Verification

- [x] Dispatch spec-compliance and code-quality review agents over the uncommitted diff.
- [x] Resolve review feedback by adding a CI/local install script and README commands for Playwright browser/system dependencies.
- [x] Run:
  - `cd frontend && npm test -- --run`
  - `cd frontend && npx tsc --noEmit`
  - `cd frontend && npm run build`
  - `cd frontend && npx playwright test --list`
  - `cd frontend && npm run test:e2e` (blocked on this host by missing `libnspr4.so`)
  - `cd backend && /home/yuxin/.local/bin/pytest -q`
  - `cd backend && /home/yuxin/.local/bin/alembic upgrade head`
  - `git diff --check`
- [ ] Commit and push:
  - `git commit -m "test: add browser e2e smoke"`
  - `git push`

## Out Of Scope

- Full coverage of every workflow. This slice restores the harness and first browser path; additional browser paths can be added incrementally.
- Real backend E2E. This first pass uses frontend route mocks for determinism.
