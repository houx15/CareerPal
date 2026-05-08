# Local Resume Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authenticated local resume upload so users can upload PDF or DOCX files for the resume path.

**Architecture:** Slice 3.1 creates the durable upload record and local storage boundary only. The upload endpoint validates authentication, MIME type/extension, and file size, writes the original file under a configurable local storage directory, and records metadata in a `resume_files` table. Text extraction and LLM structuring remain deferred to Slices 3.2 and 3.3.

**Tech Stack:** FastAPI multipart upload, SQLAlchemy models, Pydantic response schemas, pytest `TestClient`, local filesystem storage.

---

## File Structure

- Create `backend/app/models/resume.py`
  - `ResumeFile` model with user ownership, original filename, content type, byte size, local path, upload status, timestamps.
- Create `backend/app/schemas/resume.py`
  - `ResumeUploadResponse` response model.
- Create `backend/app/api/resume.py`
  - `POST /api/resume/upload` endpoint.
  - Authenticated, validates supported PDF/DOCX files and max size.
- Modify `backend/app/main.py`
  - Include resume router.
- Modify `backend/app/core/config.py`
  - Add `resume_storage_dir` and `resume_max_upload_bytes`.
- Modify `backend/app/models/__init__.py`
  - Import `ResumeFile` so test metadata creation includes the table.
- Modify `backend/tests/conftest.py`
  - Import resume models for table creation.
- Create `backend/tests/test_resume.py`
  - Behavioral upload tests.
- Modify `backend/pyproject.toml`
  - Add `python-multipart` for FastAPI multipart parsing if missing.

---

### Task 1: Authenticated Supported Upload

**Files:**
- Create: `backend/tests/test_resume.py`
- Create: `backend/app/models/resume.py`
- Create: `backend/app/schemas/resume.py`
- Create: `backend/app/api/resume.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/tests/conftest.py`
- Modify: `backend/pyproject.toml`

- [ ] **Step 1: Write failing upload success test**

Create `backend/tests/test_resume.py`:

```python
from pathlib import Path


def auth_headers(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "alex.resume@example.com", "username": "alexresume", "password": "secret123"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_authenticated_user_can_upload_pdf_resume(client, tmp_path, monkeypatch):
    monkeypatch.setenv("CAREERPAL_RESUME_STORAGE_DIR", str(tmp_path / "resumes"))
    headers = auth_headers(client)

    response = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("resume.pdf", b"%PDF-1.4\nsample resume", "application/pdf")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"]
    assert body["original_filename"] == "resume.pdf"
    assert body["content_type"] == "application/pdf"
    assert body["size_bytes"] == len(b"%PDF-1.4\nsample resume")
    assert body["status"] == "uploaded"
    assert body["created_at"]
    stored_path = Path(body["storage_path"])
    assert stored_path.exists()
    assert stored_path.read_bytes() == b"%PDF-1.4\nsample resume"
    assert stored_path.is_relative_to(tmp_path / "resumes")
```

- [ ] **Step 2: Run test to verify red**

Run:

```bash
cd backend && python3 -m pytest tests/test_resume.py::test_authenticated_user_can_upload_pdf_resume -q
```

Expected: fail because `backend/tests/test_resume.py` or `/api/resume/upload` does not exist.

- [ ] **Step 3: Add model/schema/router and multipart dependency**

Add `python-multipart>=0.0.9` to `backend/pyproject.toml`.

Create `backend/app/models/resume.py`:

```python
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.user import new_uuid


class ResumeFile(Base):
    __tablename__ = "resume_files"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="uploaded")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
```

Create `backend/app/schemas/resume.py`:

```python
from datetime import datetime

from pydantic import BaseModel


class ResumeUploadResponse(BaseModel):
    id: str
    original_filename: str
    content_type: str
    size_bytes: int
    storage_path: str
    status: str
    created_at: datetime
```

Create `backend/app/api/resume.py`:

```python
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.resume import ResumeFile
from app.models.user import User, new_uuid
from app.schemas.resume import ResumeUploadResponse

router = APIRouter(prefix="/resume", tags=["resume"])

SUPPORTED_RESUME_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


@router.post("/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeUploadResponse:
    settings = get_settings()
    suffix = _validated_resume_suffix(file)
    content = await file.read()
    if len(content) > settings.resume_max_upload_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Resume file is too large")
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume file is empty")

    storage_root = Path(settings.resume_storage_dir)
    user_dir = storage_root / current_user.id
    user_dir.mkdir(parents=True, exist_ok=True)
    storage_path = user_dir / f"{new_uuid()}{suffix}"
    storage_path.write_bytes(content)

    resume_file = ResumeFile(
        user_id=current_user.id,
        original_filename=file.filename or f"resume{suffix}",
        content_type=file.content_type or "",
        size_bytes=len(content),
        storage_path=str(storage_path),
        status="uploaded",
    )
    db.add(resume_file)
    db.commit()
    db.refresh(resume_file)
    return ResumeUploadResponse(
        id=resume_file.id,
        original_filename=resume_file.original_filename,
        content_type=resume_file.content_type,
        size_bytes=resume_file.size_bytes,
        storage_path=resume_file.storage_path,
        status=resume_file.status,
        created_at=resume_file.created_at,
    )


def _validated_resume_suffix(file: UploadFile) -> str:
    filename = file.filename or ""
    content_type = file.content_type or ""
    suffix = Path(filename).suffix.lower()
    expected_suffix = SUPPORTED_RESUME_TYPES.get(content_type)
    if expected_suffix is None or suffix != expected_suffix:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported resume file type. Upload a PDF or DOCX file.",
        )
    return suffix
```

Modify `backend/app/core/config.py`:

```python
resume_storage_dir: str = "./storage/resumes"
resume_max_upload_bytes: int = 5 * 1024 * 1024
```

Modify `backend/app/main.py` to import and include `resume_router`.

Modify `backend/app/models/__init__.py`:

```python
from app.models.resume import ResumeFile

__all__ = ["ResumeFile"]
```

Modify `backend/tests/conftest.py` to import `app.models.resume`.

- [ ] **Step 4: Run success test green**

Run:

```bash
cd backend && python3 -m pytest tests/test_resume.py::test_authenticated_user_can_upload_pdf_resume -q
```

Expected: pass.

---

### Task 2: Validation And Ownership

**Files:**
- Modify: `backend/tests/test_resume.py`
- Modify: `backend/app/api/resume.py`

- [ ] **Step 1: Write failing validation tests**

Add to `backend/tests/test_resume.py`:

```python
def test_resume_upload_requires_authentication(client):
    response = client.post(
        "/api/resume/upload",
        files={"file": ("resume.pdf", b"%PDF-1.4", "application/pdf")},
    )

    assert response.status_code == 401


def test_resume_upload_rejects_unsupported_file_type(client, tmp_path, monkeypatch):
    monkeypatch.setenv("CAREERPAL_RESUME_STORAGE_DIR", str(tmp_path / "resumes"))
    headers = auth_headers(client)

    response = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("resume.txt", b"plain text", "text/plain")},
    )

    assert response.status_code == 415
    assert response.json()["detail"] == "Unsupported resume file type. Upload a PDF or DOCX file."
    assert not (tmp_path / "resumes").exists()


def test_resume_upload_rejects_oversized_file(client, tmp_path, monkeypatch):
    monkeypatch.setenv("CAREERPAL_RESUME_STORAGE_DIR", str(tmp_path / "resumes"))
    monkeypatch.setenv("CAREERPAL_RESUME_MAX_UPLOAD_BYTES", "10")
    headers = auth_headers(client)

    response = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("resume.pdf", b"%PDF-1.4 too large", "application/pdf")},
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Resume file is too large"
    assert not (tmp_path / "resumes").exists()


def test_authenticated_user_can_upload_docx_resume(client, tmp_path, monkeypatch):
    monkeypatch.setenv("CAREERPAL_RESUME_STORAGE_DIR", str(tmp_path / "resumes"))
    headers = auth_headers(client)
    content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    response = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("resume.docx", b"PK\x03\x04docx", content_type)},
    )

    assert response.status_code == 201
    assert response.json()["content_type"] == content_type
    assert response.json()["original_filename"] == "resume.docx"
```

- [ ] **Step 2: Run validation tests red/green**

Run:

```bash
cd backend && python3 -m pytest tests/test_resume.py -q
```

Expected: all resume tests pass after any missing implementation is added.

- [ ] **Step 3: Run full backend tests**

Run:

```bash
cd backend && python3 -m pytest
```

Expected: backend suite passes.

---

### Task 3: Review And Full Verification

**Files:**
- Review: `backend/app/api/resume.py`
- Review: `backend/app/models/resume.py`
- Review: `backend/app/schemas/resume.py`
- Review: `backend/tests/test_resume.py`
- Review: `backend/app/core/config.py`
- Review: `backend/app/main.py`
- Review: `backend/pyproject.toml`

- [ ] **Step 1: Dispatch spec compliance reviewer**

Ask reviewer to check Slice 3.1 against `docs/SPEC.md`, the roadmap, and design source `docs/careerpal/project/auth.jsx`.

Expected: reviewer confirms authenticated upload, PDF/DOCX support, clear unsupported/oversize errors, and no text extraction/LLM/OSS leakage into this slice.

- [ ] **Step 2: Dispatch code quality reviewer**

Ask reviewer to check path safety, auth, file validation order, storage behavior, DB metadata, dependency correctness, and test quality.

Expected: reviewer reports no blockers or concrete fixes.

- [ ] **Step 3: Run full verification gate**

Run:

```bash
cd backend && python3 -m pytest
cd frontend && npm test -- --run
cd frontend && npx tsc --noEmit
cd frontend && npm run build
cd /home/yuxin/CareerPal && git diff --check
rm -f /home/yuxin/CareerPal/frontend/tsconfig.tsbuildinfo
cd /home/yuxin/CareerPal && git status -sb
```

Expected:

- Backend tests pass.
- Frontend tests pass.
- TypeScript check passes.
- Production build passes.
- `git diff --check` prints no whitespace errors.
- Only intended Slice 3.1 files are modified.

- [ ] **Step 4: Commit and push**

Run:

```bash
git add backend/app/models/resume.py backend/app/schemas/resume.py backend/app/api/resume.py backend/app/main.py backend/app/core/config.py backend/app/models/__init__.py backend/tests/conftest.py backend/tests/test_resume.py backend/pyproject.toml docs/superpowers/plans/2026-05-08-local-resume-upload.md
git commit -m "feat: add local resume upload"
git push
```

Expected: commit is pushed to `origin/main`.

---

## Self-Review

- Spec coverage: Implements Slice 3.1 only: model/table, local upload endpoint, supported file validation, oversize validation, authentication. Slices 3.2-3.4 remain intentionally deferred.
- Design coverage: Matches the design bundle's onboarding file attachment path by accepting resume files during the resume path. Frontend wiring remains deferred because this slice's acceptance is the backend upload contract.
- Placeholder scan: No `TBD`, `TODO`, or undefined implementation references.
- Type consistency: Uses `ResumeFile`, `ResumeUploadResponse`, `resume_storage_dir`, and `resume_max_upload_bytes` consistently.
