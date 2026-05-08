from pathlib import Path
import shutil
import tempfile

from fastapi import HTTPException, status

class StorageConfigurationError(RuntimeError):
    pass


class LocalResumeStorage:
    def __init__(self, root_dir: str | Path):
        self.root_dir = Path(root_dir)

    def save(self, source_path: Path, object_key: str) -> str:
        destination = self._destination_for(object_key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source_path, destination)
        return str(destination)

    def delete(self, storage_path: str) -> None:
        path = Path(storage_path)
        if path.exists():
            path.unlink()

    def _destination_for(self, object_key: str) -> Path:
        object_path = Path(object_key)
        if object_path.is_absolute() or ".." in object_path.parts:
            raise StorageConfigurationError("Invalid resume storage object key")
        destination = self.root_dir / object_path
        try:
            destination.resolve().relative_to(self.root_dir.resolve())
        except ValueError as exc:
            raise StorageConfigurationError("Invalid resume storage object key") from exc
        return destination


class AlibabaOssResumeStorage:
    def __init__(self, endpoint: str, bucket: str, access_key_id: str, access_key_secret: str):
        self.endpoint = endpoint
        self.bucket = bucket
        self.access_key_id = access_key_id
        self.access_key_secret = access_key_secret

    def save(self, source_path: Path, object_key: str) -> str:
        oss2 = _load_oss2()
        auth = oss2.Auth(self.access_key_id, self.access_key_secret)
        bucket = oss2.Bucket(auth, self.endpoint, self.bucket)
        with source_path.open("rb") as source_file:
            bucket.put_object(object_key, source_file)
        return f"oss://{self.bucket}/{object_key}"

    def delete(self, storage_path: str) -> None:
        object_key = _object_key_from_storage_path(storage_path, self.bucket)
        if object_key is None:
            return
        oss2 = _load_oss2()
        auth = oss2.Auth(self.access_key_id, self.access_key_secret)
        bucket = oss2.Bucket(auth, self.endpoint, self.bucket)
        bucket.delete_object(object_key)


def make_resume_object_key(user_id: str, file_id: str, suffix: str) -> str:
    return f"resumes/{user_id}/{file_id}{suffix}"


def build_resume_storage(settings):
    if settings.resume_storage_provider == "local":
        return LocalResumeStorage(settings.resume_storage_dir)
    if settings.resume_storage_provider == "oss":
        missing = [
            name
            for name, value in (
                ("oss_endpoint", settings.oss_endpoint),
                ("oss_bucket", settings.oss_bucket),
                ("oss_access_key_id", settings.oss_access_key_id),
                ("oss_access_key_secret", settings.oss_access_key_secret),
            )
            if not value
        ]
        if missing:
            raise StorageConfigurationError(f"Missing OSS configuration: {', '.join(missing)}")
        return AlibabaOssResumeStorage(
            endpoint=settings.oss_endpoint,
            bucket=settings.oss_bucket,
            access_key_id=settings.oss_access_key_id,
            access_key_secret=settings.oss_access_key_secret,
        )
    raise StorageConfigurationError("Unsupported resume storage provider")


async def validate_and_copy_resume_to_temp(file, max_upload_bytes: int, suffix: str) -> tuple[Path, int]:
    total_bytes = 0
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_path = Path(temp_file.name)
            while True:
                chunk = await file.read(64 * 1024)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_upload_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Resume file is too large",
                    )
                temp_file.write(chunk)

        if total_bytes == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume file is empty")
        if not has_valid_resume_content(temp_path, suffix):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Unsupported resume file type. Upload a valid PDF or DOCX file.",
            )
        return temp_path, total_bytes
    except Exception:
        if temp_path is not None and temp_path.exists():
            temp_path.unlink()
        raise


def has_valid_resume_content(path: Path, suffix: str) -> bool:
    if suffix == ".pdf":
        return path.read_bytes()[:5] == b"%PDF-"
    if suffix == ".docx":
        import zipfile

        try:
            with zipfile.ZipFile(path) as archive:
                names = set(archive.namelist())
        except zipfile.BadZipFile:
            return False
        return "[Content_Types].xml" in names and "word/document.xml" in names
    return False


def _load_oss2():
    try:
        import oss2
    except ImportError as exc:
        raise StorageConfigurationError("The oss2 package is required for OSS resume storage") from exc
    return oss2


def _object_key_from_storage_path(storage_path: str, bucket: str) -> str | None:
    prefix = f"oss://{bucket}/"
    if not storage_path.startswith(prefix):
        return None
    return storage_path.removeprefix(prefix)
