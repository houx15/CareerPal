from pathlib import Path
import sys
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.services.resume_storage import (
    AlibabaOssResumeStorage,
    LocalResumeStorage,
    StorageConfigurationError,
    build_resume_storage,
    has_valid_resume_content,
    make_resume_object_key,
)


def test_make_resume_object_key_uses_spec_resume_prefix_and_file_id():
    key = make_resume_object_key(user_id="user-123", file_id="file-456", suffix=".pdf")

    assert key == "resumes/user-123/file-456.pdf"


def test_local_resume_storage_saves_under_object_key(tmp_path):
    source = tmp_path / "resume.pdf"
    source.write_bytes(b"%PDF-1.4 local resume")
    storage = LocalResumeStorage(root_dir=tmp_path / "storage")

    stored_path = storage.save(source, "resumes/user-123/resume.pdf")

    assert stored_path == str(tmp_path / "storage" / "resumes" / "user-123" / "resume.pdf")
    assert Path(stored_path).read_bytes() == b"%PDF-1.4 local resume"


def test_local_resume_storage_rejects_path_traversal(tmp_path):
    source = tmp_path / "resume.pdf"
    source.write_bytes(b"%PDF-1.4 local resume")
    storage = LocalResumeStorage(root_dir=tmp_path / "storage")

    with pytest.raises(StorageConfigurationError, match="Invalid resume storage object key"):
        storage.save(source, "../resume.pdf")


def test_build_resume_storage_requires_complete_oss_config():
    settings = Settings(
        resume_storage_provider="oss",
        oss_endpoint="",
        oss_bucket="careerpal-bucket",
        oss_access_key_id="",
        oss_access_key_secret="secret",
    )

    with pytest.raises(StorageConfigurationError, match="oss_endpoint"):
        build_resume_storage(settings)


def test_build_resume_storage_creates_oss_storage_for_complete_config():
    settings = Settings(
        resume_storage_provider="oss",
        oss_endpoint="https://oss-cn-hangzhou.aliyuncs.com",
        oss_bucket="careerpal-bucket",
        oss_access_key_id="test-access-key",
        oss_access_key_secret="test-secret",
    )

    storage = build_resume_storage(settings)

    assert storage.bucket == "careerpal-bucket"
    assert storage.endpoint == "https://oss-cn-hangzhou.aliyuncs.com"


def test_production_requires_oss_storage_provider():
    with pytest.raises(ValidationError, match="resume_storage_provider must be oss outside local and test"):
        Settings(environment="production", secret_key="production-secret", resume_storage_provider="local")


def test_production_oss_provider_requires_complete_config():
    with pytest.raises(ValidationError, match="oss_endpoint must be configured"):
        Settings(
            environment="production",
            secret_key="production-secret",
            resume_storage_provider="oss",
            oss_bucket="careerpal-bucket",
            oss_access_key_secret="test-secret",
        )


def test_alibaba_oss_storage_puts_object_and_returns_uri(tmp_path, monkeypatch):
    source = tmp_path / "resume.pdf"
    source.write_bytes(b"%PDF-1.4 oss resume")
    calls = {}

    class FakeBucket:
        def __init__(self, auth, endpoint, bucket):
            calls["auth"] = auth
            calls["endpoint"] = endpoint
            calls["bucket"] = bucket

        def put_object(self, object_key, source_file):
            calls["put_object"] = (object_key, source_file.read())

    fake_oss2 = SimpleNamespace(
        Auth=lambda access_key_id, access_key_secret: (access_key_id, access_key_secret),
        Bucket=FakeBucket,
    )
    monkeypatch.setitem(sys.modules, "oss2", fake_oss2)
    storage = AlibabaOssResumeStorage(
        endpoint="https://oss-cn-hangzhou.aliyuncs.com",
        bucket="careerpal-bucket",
        access_key_id="test-access-key",
        access_key_secret="test-secret",
    )

    uri = storage.save(source, "resumes/user-123/file-456.pdf")

    assert uri == "oss://careerpal-bucket/resumes/user-123/file-456.pdf"
    assert calls["auth"] == ("test-access-key", "test-secret")
    assert calls["endpoint"] == "https://oss-cn-hangzhou.aliyuncs.com"
    assert calls["bucket"] == "careerpal-bucket"
    assert calls["put_object"] == ("resumes/user-123/file-456.pdf", b"%PDF-1.4 oss resume")


def test_alibaba_oss_storage_delete_extracts_object_key(monkeypatch):
    calls = {}

    class FakeBucket:
        def __init__(self, auth, endpoint, bucket):
            calls["bucket"] = bucket

        def delete_object(self, object_key):
            calls["delete_object"] = object_key

    fake_oss2 = SimpleNamespace(
        Auth=lambda access_key_id, access_key_secret: (access_key_id, access_key_secret),
        Bucket=FakeBucket,
    )
    monkeypatch.setitem(sys.modules, "oss2", fake_oss2)
    storage = AlibabaOssResumeStorage(
        endpoint="https://oss-cn-hangzhou.aliyuncs.com",
        bucket="careerpal-bucket",
        access_key_id="test-access-key",
        access_key_secret="test-secret",
    )

    storage.delete("oss://careerpal-bucket/resumes/user-123/file-456.pdf")

    assert calls["bucket"] == "careerpal-bucket"
    assert calls["delete_object"] == "resumes/user-123/file-456.pdf"


def test_has_valid_resume_content_rejects_unknown_suffix(tmp_path):
    path = tmp_path / "resume.txt"
    path.write_text("plain text")

    assert has_valid_resume_content(path, ".txt") is False
