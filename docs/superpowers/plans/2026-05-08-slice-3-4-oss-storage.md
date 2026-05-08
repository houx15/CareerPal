# Slice 3.4 OSS Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Alibaba Cloud OSS as a production resume-original storage backend while keeping local/fake storage deterministic in tests.

**Architecture:** Resume upload validates content into a temporary file, parses that local temporary file, then stores the original through a backend selected by `CAREERPAL_RESUME_STORAGE_PROVIDER`. Local storage writes under the configured storage root; OSS storage writes object keys under `resumes/{user_id}/`.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic Settings, Alibaba Cloud `oss2`, pytest.

---

### Task 1: Storage Backend Contract

**Files:**
- Create: `backend/app/services/resume_storage.py`
- Modify: `backend/app/core/config.py`
- Test: `backend/tests/test_resume_storage.py`

- [x] **Step 1: Write failing storage tests**

Cover object-key construction, local writes under object keys, path traversal rejection, and incomplete OSS config rejection.

- [x] **Step 2: Run tests to verify RED**

Run: `cd backend && python3 -m pytest tests/test_resume_storage.py tests/test_resume.py::test_resume_upload_uses_oss_storage_key_in_oss_mode -q`

Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.resume_storage'`.

- [x] **Step 3: Implement minimal storage backends**

Add `LocalResumeStorage`, `AlibabaOssResumeStorage`, `build_resume_storage()`, and `make_resume_object_key()`.

- [x] **Step 4: Verify storage tests pass**

Run: `cd backend && python3 -m pytest tests/test_resume_storage.py -q`

### Task 2: Resume Upload Integration

**Files:**
- Modify: `backend/app/api/resume.py`
- Modify: `backend/tests/test_resume.py`
- Modify: `backend/.env.example`
- Modify: `backend/pyproject.toml`

- [x] **Step 1: Write failing upload integration test**

Cover OSS mode storing to `oss://careerpal-bucket/resumes/{user_id}/...` through a fake storage object, with no local storage directory created.

- [x] **Step 2: Run tests to verify RED**

The initial RED is covered by the missing storage service failure.

- [x] **Step 3: Refactor upload to parse temp files and store through backend**

Keep public response unchanged; persist only storage path internally.

- [x] **Step 4: Run focused GREEN tests**

Run: `cd backend && python3 -m pytest tests/test_resume_storage.py tests/test_resume.py::test_resume_upload_uses_oss_storage_key_in_oss_mode -q`

### Task 3: Full Verification And Review

**Files:**
- All changed backend files

- [x] **Step 1: Run backend test suite**

Run: `cd backend && python3 -m pytest`

- [x] **Step 2: Run frontend regression checks**

Run: `cd frontend && npm test -- --run && npx tsc --noEmit && npm run build`

- [x] **Step 3: Request subagent review**

Review for spec compliance, OSS credential safety, cleanup behavior, and local/fake test determinism.
