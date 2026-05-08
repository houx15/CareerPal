# Resume Text Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract plain text from uploaded PDF and DOCX resumes and expose parse status/results.

**Architecture:** Slice 3.2 extends the local `ResumeFile` upload record with extraction fields and performs synchronous text extraction immediately after a valid upload. The API exposes `parse-status` and `parsed` endpoints for the uploaded file. This slice stores plain extracted text only; LLM structuring and follow-up conversation start in Slice 3.3.

**Tech Stack:** FastAPI, SQLAlchemy/Alembic, PyMuPDF (`pymupdf`), `python-docx`, pytest fixtures.

---

## File Structure

- Modify `backend/app/models/resume.py`
  - Add `parsed_text`, `parse_error`, `parsed_at` columns.
- Add `backend/alembic/versions/0010_resume_text_extraction.py`
  - Add extraction columns to `resume_files`.
- Modify `backend/app/schemas/resume.py`
  - Add `ResumeParseStatusResponse` and `ResumeParsedTextResponse`.
  - Add parse fields to upload response if useful.
- Create `backend/app/services/resume_extraction.py`
  - `extract_resume_text(path, content_type)` dispatches PDF/DOCX extraction.
  - Empty/unreadable files produce actionable `ResumeExtractionError`.
- Modify `backend/app/api/resume.py`
  - After storing upload and creating DB row, extract text and update parse fields.
  - Add `GET /api/resume/parse-status/{resume_id}`.
  - Add `GET /api/resume/parsed/{resume_id}`.
- Modify `backend/pyproject.toml`
  - Add `pymupdf` and `python-docx`.
- Modify `backend/tests/test_resume.py`
  - Add fixture PDF/DOCX generation and endpoint tests.
- Modify `backend/tests/test_health.py`
  - Extend migration schema coverage for extraction columns.

---

### Task 1: PDF/DOCX Extraction Service

**Files:**
- Create: `backend/app/services/resume_extraction.py`
- Modify: `backend/tests/test_resume.py`
- Modify: `backend/pyproject.toml`

- [ ] **Step 1: Write failing service tests for PDF and DOCX text extraction**

Add to `backend/tests/test_resume.py`:

```python
import fitz
from docx import Document

from app.services.resume_extraction import ResumeExtractionError, extract_resume_text


def make_pdf_bytes(text: str) -> bytes:
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), text)
    return document.tobytes()


def make_docx_bytes_with_text(text: str) -> bytes:
    path = Path("/tmp/careerpal-test.docx")
    document = Document()
    document.add_paragraph(text)
    document.save(path)
    content = path.read_bytes()
    path.unlink()
    return content


def test_extracts_text_from_pdf_fixture(tmp_path):
    path = tmp_path / "resume.pdf"
    path.write_bytes(make_pdf_bytes("Alex Chen Backend Engineer"))

    text = extract_resume_text(path, "application/pdf")

    assert "Alex Chen Backend Engineer" in text


def test_extracts_text_from_docx_fixture(tmp_path):
    path = tmp_path / "resume.docx"
    path.write_bytes(make_docx_bytes_with_text("Built distributed systems"))

    text = extract_resume_text(
        path,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )

    assert "Built distributed systems" in text
```

- [ ] **Step 2: Run service tests red**

Run:

```bash
cd backend && python3 -m pytest tests/test_resume.py::test_extracts_text_from_pdf_fixture tests/test_resume.py::test_extracts_text_from_docx_fixture -q
```

Expected: fail because `app.services.resume_extraction` or dependencies do not exist.

- [ ] **Step 3: Add dependencies and extraction service**

Add dependencies to `backend/pyproject.toml`:

```toml
"pymupdf>=1.24",
"python-docx>=1.1",
```

Create `backend/app/services/resume_extraction.py`:

```python
from pathlib import Path

import fitz
from docx import Document


PDF_CONTENT_TYPE = "application/pdf"
DOCX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


class ResumeExtractionError(Exception):
    pass


def extract_resume_text(path: Path, content_type: str) -> str:
    try:
        if content_type == PDF_CONTENT_TYPE:
            text = _extract_pdf_text(path)
        elif content_type == DOCX_CONTENT_TYPE:
            text = _extract_docx_text(path)
        else:
            raise ResumeExtractionError("Unsupported resume file type")
    except ResumeExtractionError:
        raise
    except Exception as exc:
        raise ResumeExtractionError("Resume text could not be extracted") from exc

    normalized = "\n".join(line.strip() for line in text.splitlines() if line.strip()).strip()
    if not normalized:
        raise ResumeExtractionError("Resume file does not contain readable text")
    return normalized


def _extract_pdf_text(path: Path) -> str:
    with fitz.open(path) as document:
        return "\n".join(page.get_text() for page in document)


def _extract_docx_text(path: Path) -> str:
    document = Document(path)
    return "\n".join(paragraph.text for paragraph in document.paragraphs)
```

- [ ] **Step 4: Run service tests green**

Run:

```bash
cd backend && python3 -m pytest tests/test_resume.py::test_extracts_text_from_pdf_fixture tests/test_resume.py::test_extracts_text_from_docx_fixture -q
```

Expected: pass.

---

### Task 2: Upload Pipeline And Parse Endpoints

**Files:**
- Modify: `backend/app/models/resume.py`
- Add: `backend/alembic/versions/0010_resume_text_extraction.py`
- Modify: `backend/app/schemas/resume.py`
- Modify: `backend/app/api/resume.py`
- Modify: `backend/tests/test_resume.py`
- Modify: `backend/tests/test_health.py`

- [ ] **Step 1: Write failing API tests for parsed text and status**

Add to `backend/tests/test_resume.py`:

```python
def test_upload_extracts_pdf_text_and_exposes_parse_result(client, db_session, tmp_path, monkeypatch):
    configure_resume_storage(monkeypatch, tmp_path / "resumes")
    headers = auth_headers(client)

    upload = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("resume.pdf", make_pdf_bytes("Alex Chen Backend Engineer"), "application/pdf")},
    )

    assert upload.status_code == 201
    resume_id = upload.json()["id"]
    status_response = client.get(f"/api/resume/parse-status/{resume_id}", headers=headers)
    parsed_response = client.get(f"/api/resume/parsed/{resume_id}", headers=headers)

    assert status_response.status_code == 200
    assert status_response.json()["status"] == "parsed"
    assert status_response.json()["parse_error"] is None
    assert parsed_response.status_code == 200
    assert "Alex Chen Backend Engineer" in parsed_response.json()["parsed_text"]

    resume_file = db_session.get(ResumeFile, resume_id)
    assert resume_file.status == "parsed"
    assert "Alex Chen Backend Engineer" in resume_file.parsed_text
    assert resume_file.parsed_at is not None


def test_upload_records_actionable_error_for_unreadable_resume(client, db_session, tmp_path, monkeypatch):
    configure_resume_storage(monkeypatch, tmp_path / "resumes")
    headers = auth_headers(client)

    response = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("resume.pdf", b"%PDF-1.4\n%%EOF", "application/pdf")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "parse_failed"
    assert body["parse_error"] == "Resume file does not contain readable text"
    resume_id = body["id"]
    parsed_response = client.get(f"/api/resume/parsed/{resume_id}", headers=headers)
    assert parsed_response.status_code == 422
    assert parsed_response.json()["detail"] == "Resume text has not been extracted"
```

- [ ] **Step 2: Run API tests red**

Run:

```bash
cd backend && python3 -m pytest tests/test_resume.py::test_upload_extracts_pdf_text_and_exposes_parse_result tests/test_resume.py::test_upload_records_actionable_error_for_unreadable_resume -q
```

Expected: fail because parse columns/endpoints do not exist.

- [ ] **Step 3: Add model columns and migration**

Modify `backend/app/models/resume.py`:

```python
from sqlalchemy import Text

parsed_text: Mapped[str | None] = mapped_column(Text, nullable=True)
parse_error: Mapped[str | None] = mapped_column(Text, nullable=True)
parsed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

Create `backend/alembic/versions/0010_resume_text_extraction.py`:

```python
"""add resume text extraction fields

Revision ID: 0010_resume_text_extraction
Revises: 0009_resume_files
Create Date: 2026-05-08 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0010_resume_text_extraction"
down_revision: str | None = "0009_resume_files"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("resume_files", sa.Column("parsed_text", sa.Text(), nullable=True))
    op.add_column("resume_files", sa.Column("parse_error", sa.Text(), nullable=True))
    op.add_column("resume_files", sa.Column("parsed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("resume_files", "parsed_at")
    op.drop_column("resume_files", "parse_error")
    op.drop_column("resume_files", "parsed_text")
```

Update migration test expected columns to include `parsed_text`, `parse_error`, `parsed_at`.

- [ ] **Step 4: Add schemas, extraction call, and endpoints**

Modify `backend/app/schemas/resume.py`:

```python
class ResumeParseStatusResponse(BaseModel):
    id: str
    status: str
    parse_error: str | None = None
    parsed_at: datetime | None = None


class ResumeParsedTextResponse(BaseModel):
    id: str
    parsed_text: str
```

Add `parse_error` and `parsed_at` to `ResumeUploadResponse`.

Modify `backend/app/api/resume.py`:

- Import `datetime`, `timezone`, `select`, `ResumeExtractionError`, `extract_resume_text`, new schemas.
- After `db.refresh(resume_file)` and before `db.commit()`, call extraction:

```python
try:
    resume_file.parsed_text = extract_resume_text(storage_path, resume_file.content_type)
    resume_file.parse_error = None
    resume_file.parsed_at = datetime.now(timezone.utc)
    resume_file.status = "parsed"
except ResumeExtractionError as exc:
    resume_file.parsed_text = None
    resume_file.parse_error = str(exc)
    resume_file.parsed_at = None
    resume_file.status = "parse_failed"
```

- Add owned lookup helper.
- Add `GET /api/resume/parse-status/{resume_id}`.
- Add `GET /api/resume/parsed/{resume_id}` returning 422 if not parsed.

- [ ] **Step 5: Run API tests green**

Run:

```bash
cd backend && python3 -m pytest tests/test_resume.py::test_upload_extracts_pdf_text_and_exposes_parse_result tests/test_resume.py::test_upload_records_actionable_error_for_unreadable_resume -q
```

Expected: pass.

---

### Task 3: Guard Behavior And Full Backend

**Files:**
- Modify: `backend/tests/test_resume.py`
- Modify: `backend/app/api/resume.py`

- [ ] **Step 1: Add tests for ownership and parse-status failures**

Add:

```python
def test_resume_parse_endpoints_reject_files_owned_by_another_user(client, tmp_path, monkeypatch):
    configure_resume_storage(monkeypatch, tmp_path / "resumes")
    owner_headers = auth_headers(client)
    upload = client.post(
        "/api/resume/upload",
        headers=owner_headers,
        files={"file": ("resume.pdf", make_pdf_bytes("Private resume"), "application/pdf")},
    )
    other = client.post(
        "/api/auth/register",
        json={"email": "jamie.resume@example.com", "username": "jamieresume", "password": "secret123"},
    ).json()

    response = client.get(
        f"/api/resume/parsed/{upload.json()['id']}",
        headers={"Authorization": f"Bearer {other['access_token']}"},
    )

    assert response.status_code == 404
```

- [ ] **Step 2: Run full resume and migration tests**

Run:

```bash
cd backend && python3 -m pytest tests/test_resume.py tests/test_health.py::test_initial_migration_creates_fresh_database -q
```

Expected: pass.

- [ ] **Step 3: Run full backend tests**

Run:

```bash
cd backend && python3 -m pytest
```

Expected: pass.

---

### Task 4: Review And Full Verification

**Files:**
- Review all changed backend files and plan.

- [ ] **Step 1: Dispatch spec compliance reviewer**

Check Slice 3.2 acceptance:

- Fixture PDF/DOCX extraction covered.
- Empty/unreadable files produce actionable errors.
- Parsed text or structured intermediate stored.
- No LLM structuring or OSS scope creep.

- [ ] **Step 2: Dispatch code quality reviewer**

Check parser error handling, file safety, endpoint ownership, migration correctness, test quality, and dependency correctness.

- [ ] **Step 3: Full verification gate**

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

- [ ] **Step 4: Commit and push**

Run:

```bash
git add backend/app/services/resume_extraction.py backend/app/api/resume.py backend/app/models/resume.py backend/app/schemas/resume.py backend/alembic/versions/0010_resume_text_extraction.py backend/tests/test_resume.py backend/tests/test_health.py backend/pyproject.toml docs/superpowers/plans/2026-05-08-resume-text-extraction.md
git commit -m "feat: extract resume text"
git push
```

---

## Self-Review

- Spec coverage: Implements Slice 3.2 extraction and result/status visibility. Does not structure text into profile entities.
- Dependency risk: Requires `pymupdf` and `python-docx`; install locally if missing for tests.
- Placeholder scan: No `TBD` or undefined implementation references.
