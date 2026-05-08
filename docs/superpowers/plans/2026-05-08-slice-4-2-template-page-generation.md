# Slice 4.2 Template Page Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Scope

Implement `POST /api/page/generate` for authenticated users. The endpoint must generate a complete self-contained HTML/CSS page from the current structured profile and a selected built-in style template, persist it as the next user-local page version, and return the generated page preview shape already used by `GET /api/page/preview`.

This slice is backend-first. Frontend wiring for invoking the endpoint from the design bundle is a later slice unless the current roadmap says otherwise.

## Design Constraints

- Follow `docs/SPEC.md` Section 9.3 page generation prompt.
- Keep automated tests deterministic: no real LLM calls in pytest.
- Use the existing LLM abstraction in `backend/app/services/llm.py`.
- Treat `docs/careerpal/project/screens.jsx` as the product interaction reference:
  - The in-app names are `clean`, `modern`, and `terminal`.
  - The backend style ids remain explicit stable ids: `clean-professional`, `modern-creative`, `technical`.
- Never include empty profile sections in the generation prompt.
- Do not invent profile content. The prompt and deterministic fake/stub tests must prove only supplied profile data is used.

## Files

- `backend/app/schemas/page.py`: request schema for style template selection.
- `backend/app/services/page_generation.py`: template metadata, profile payload filtering, prompt construction, async generation helper.
- `backend/app/api/page.py`: `POST /generate`, next-version persistence, error handling.
- `backend/tests/test_page_generation.py`: TDD tests for the endpoint and service behavior.

## Tasks

- [x] Add failing tests for authenticated generation, supported style templates, persisted version 1, and preview response.
- [x] Add failing tests for version incrementing and auth requirement.
- [x] Add failing tests proving the LLM prompt contains populated profile data and omits empty sections.
- [x] Add failing tests for unsupported template validation and LLM provider failure rollback.
- [x] Implement page generation schemas and service with minimal behavior to pass the tests.
- [x] Wire `POST /api/page/generate` to the service and persist `GeneratedPage`.
- [x] Run focused backend tests, then full backend and frontend verification.
- [x] Request subagent code review and address findings.
- [x] Commit and push.
