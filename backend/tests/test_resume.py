import asyncio
import zipfile
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api import resume as resume_api
from app.api.resume import store_validated_resume
from app.core.config import get_settings
from app.models.resume import ResumeFile


@pytest.fixture(autouse=True)
def clear_settings_cache_after_test():
    yield
    get_settings.cache_clear()


def auth_headers(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "alex.resume@example.com", "username": "alexresume", "password": "secret123"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def make_docx_bytes() -> bytes:
    archive_path = Path("/tmp/careerpal-test.docx")
    with zipfile.ZipFile(archive_path, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types></Types>")
        archive.writestr("word/document.xml", "<w:document></w:document>")
    content = archive_path.read_bytes()
    archive_path.unlink()
    return content


def configure_resume_storage(monkeypatch, storage_dir, max_upload_bytes=None):
    monkeypatch.setenv("CAREERPAL_RESUME_STORAGE_DIR", str(storage_dir))
    if max_upload_bytes is not None:
        monkeypatch.setenv("CAREERPAL_RESUME_MAX_UPLOAD_BYTES", str(max_upload_bytes))
    get_settings.cache_clear()


def test_authenticated_user_can_upload_pdf_resume(client, db_session, tmp_path, monkeypatch):
    configure_resume_storage(monkeypatch, tmp_path / "resumes")
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
    assert "storage_path" not in body
    resume_file = db_session.get(ResumeFile, body["id"])
    assert resume_file is not None
    assert resume_file.user_id
    stored_path = Path(resume_file.storage_path)
    assert stored_path.exists()
    assert stored_path.read_bytes() == b"%PDF-1.4\nsample resume"
    assert stored_path.is_relative_to(tmp_path / "resumes")


def test_resume_upload_requires_authentication(client):
    response = client.post(
        "/api/resume/upload",
        files={"file": ("resume.pdf", b"%PDF-1.4", "application/pdf")},
    )

    assert response.status_code == 401


def test_resume_upload_rejects_unsupported_file_type(client, db_session, tmp_path, monkeypatch):
    configure_resume_storage(monkeypatch, tmp_path / "resumes")
    headers = auth_headers(client)

    response = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("resume.txt", b"plain text", "text/plain")},
    )

    assert response.status_code == 415
    assert response.json()["detail"] == "Unsupported resume file type. Upload a PDF or DOCX file."
    assert not (tmp_path / "resumes").exists()
    assert db_session.query(ResumeFile).count() == 0


def test_resume_upload_rejects_oversized_file(client, db_session, tmp_path, monkeypatch):
    configure_resume_storage(monkeypatch, tmp_path / "resumes", max_upload_bytes=10)
    headers = auth_headers(client)

    response = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("resume.pdf", b"%PDF-1.4 too large", "application/pdf")},
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Resume file is too large"
    assert not (tmp_path / "resumes").exists()
    assert db_session.query(ResumeFile).count() == 0


def test_authenticated_user_can_upload_docx_resume(client, tmp_path, monkeypatch):
    configure_resume_storage(monkeypatch, tmp_path / "resumes")
    headers = auth_headers(client)
    content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    response = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("resume.docx", make_docx_bytes(), content_type)},
    )

    assert response.status_code == 201
    assert response.json()["content_type"] == content_type
    assert response.json()["original_filename"] == "resume.docx"


def test_resume_upload_rejects_spoofed_pdf_content(client, db_session, tmp_path, monkeypatch):
    configure_resume_storage(monkeypatch, tmp_path / "resumes")
    headers = auth_headers(client)

    response = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("resume.pdf", b"not really a pdf", "application/pdf")},
    )

    assert response.status_code == 415
    assert response.json()["detail"] == "Unsupported resume file type. Upload a valid PDF or DOCX file."
    assert not (tmp_path / "resumes").exists()
    assert db_session.query(ResumeFile).count() == 0


def test_resume_upload_rejects_spoofed_docx_content(client, db_session, tmp_path, monkeypatch):
    configure_resume_storage(monkeypatch, tmp_path / "resumes")
    headers = auth_headers(client)
    content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    response = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("resume.docx", b"PK\x03\x04not-docx", content_type)},
    )

    assert response.status_code == 415
    assert response.json()["detail"] == "Unsupported resume file type. Upload a valid PDF or DOCX file."
    assert not (tmp_path / "resumes").exists()
    assert db_session.query(ResumeFile).count() == 0


def test_resume_storage_stops_reading_after_size_limit(tmp_path):
    class ChunkedFile:
        def __init__(self):
            self.read_calls = 0

        async def read(self, size):
            self.read_calls += 1
            if self.read_calls == 1:
                return b"%PDF-1.4\n"
            if self.read_calls == 2:
                return b"x" * 8
            raise AssertionError("reader continued after upload exceeded the byte limit")

    upload = ChunkedFile()

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(store_validated_resume(upload, tmp_path / "resume.pdf", max_upload_bytes=10, suffix=".pdf"))

    assert exc_info.value.status_code == 413
    assert not (tmp_path / "resume.pdf").exists()


def test_resume_upload_removes_stored_file_when_db_commit_fails(client, tmp_path, monkeypatch):
    configure_resume_storage(monkeypatch, tmp_path / "resumes")
    stored_paths = []

    class FailingDb:
        rolled_back = False

        def add(self, resume_file):
            stored_paths.append(Path(resume_file.storage_path))

        def flush(self):
            pass

        def refresh(self, resume_file):
            pass

        def commit(self):
            raise RuntimeError("commit failed")

        def rollback(self):
            self.rolled_back = True

        def close(self):
            pass

    failing_db = FailingDb()

    def override_db():
        yield failing_db

    client.app.dependency_overrides[resume_api.get_current_user] = lambda: SimpleNamespace(id="user-1")
    client.app.dependency_overrides[resume_api.get_db] = override_db
    try:
        with pytest.raises(RuntimeError, match="commit failed"):
            client.post(
                "/api/resume/upload",
                files={"file": ("resume.pdf", b"%PDF-1.4\nsample resume", "application/pdf")},
            )
    finally:
        client.app.dependency_overrides.pop(resume_api.get_current_user, None)
        client.app.dependency_overrides.pop(resume_api.get_db, None)

    assert failing_db.rolled_back is True
    assert stored_paths
    assert not stored_paths[0].exists()


def test_resume_upload_removes_stored_file_when_db_refresh_fails_before_commit(client, tmp_path, monkeypatch):
    configure_resume_storage(monkeypatch, tmp_path / "resumes")
    stored_paths = []

    class FailingDb:
        committed = False
        rolled_back = False

        def add(self, resume_file):
            stored_paths.append(Path(resume_file.storage_path))

        def flush(self):
            pass

        def refresh(self, resume_file):
            raise RuntimeError("refresh failed")

        def commit(self):
            self.committed = True

        def rollback(self):
            self.rolled_back = True

        def close(self):
            pass

    failing_db = FailingDb()

    def override_db():
        yield failing_db

    client.app.dependency_overrides[resume_api.get_current_user] = lambda: SimpleNamespace(id="user-1")
    client.app.dependency_overrides[resume_api.get_db] = override_db
    try:
        with pytest.raises(RuntimeError, match="refresh failed"):
            client.post(
                "/api/resume/upload",
                files={"file": ("resume.pdf", b"%PDF-1.4\nsample resume", "application/pdf")},
            )
    finally:
        client.app.dependency_overrides.pop(resume_api.get_current_user, None)
        client.app.dependency_overrides.pop(resume_api.get_db, None)

    assert failing_db.committed is False
    assert failing_db.rolled_back is True
    assert stored_paths
    assert not stored_paths[0].exists()
