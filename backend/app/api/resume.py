from datetime import datetime, timezone
from pathlib import Path
import tempfile
import zipfile

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.profile import _profile_response
from app.core.config import get_settings
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.resume import ResumeFile
from app.models.user import User, new_uuid
from app.schemas.resume import (
    ResumeParsedTextResponse,
    ResumeParseStatusResponse,
    ResumeStructureResponse,
    ResumeUploadResponse,
)
from app.services.llm import LLMProviderError, build_llm_client
from app.services.resume_extraction import ResumeExtractionError, extract_resume_text
from app.services.resume_structuring import ResumeStructureError, apply_resume_structure, structure_resume_text

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
    storage_root = Path(settings.resume_storage_dir)
    user_dir = storage_root / current_user.id
    storage_path = user_dir / f"{new_uuid()}{suffix}"
    size_bytes = await store_validated_resume(
        file,
        storage_path,
        max_upload_bytes=settings.resume_max_upload_bytes,
        suffix=suffix,
    )
    try:
        parsed_text = extract_resume_text(storage_path, file.content_type or "")
        parse_error = None
        parsed_at = datetime.now(timezone.utc)
        upload_status = "parsed"
    except ResumeExtractionError as exc:
        parsed_text = None
        parse_error = str(exc)
        parsed_at = None
        upload_status = "parse_failed"

    resume_file = ResumeFile(
        user_id=current_user.id,
        original_filename=file.filename or f"resume{suffix}",
        content_type=file.content_type or "",
        size_bytes=size_bytes,
        storage_path=str(storage_path),
        status=upload_status,
        parsed_text=parsed_text,
        parse_error=parse_error,
        parsed_at=parsed_at,
    )
    db.add(resume_file)
    try:
        db.flush()
        db.refresh(resume_file)
        db.commit()
    except Exception:
        db.rollback()
        if storage_path.exists():
            storage_path.unlink()
        raise
    return ResumeUploadResponse(
        id=resume_file.id,
        original_filename=resume_file.original_filename,
        content_type=resume_file.content_type,
        size_bytes=resume_file.size_bytes,
        status=resume_file.status,
        parse_error=resume_file.parse_error,
        parsed_at=resume_file.parsed_at,
        created_at=resume_file.created_at,
    )


@router.get("/parse-status/{resume_id}", response_model=ResumeParseStatusResponse)
def get_resume_parse_status(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeParseStatusResponse:
    resume_file = _get_owned_resume_file(db, current_user, resume_id)
    return ResumeParseStatusResponse(
        id=resume_file.id,
        status=resume_file.status,
        parse_error=resume_file.parse_error,
        parsed_at=resume_file.parsed_at,
        structure_error=resume_file.structure_error,
        structured_at=resume_file.structured_at,
    )


@router.get("/parsed/{resume_id}", response_model=ResumeParsedTextResponse)
def get_resume_parsed_text(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeParsedTextResponse:
    resume_file = _get_owned_resume_file(db, current_user, resume_id)
    if resume_file.status not in {"parsed", "structured", "structure_failed"} or not resume_file.parsed_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Resume text has not been extracted",
        )
    return ResumeParsedTextResponse(id=resume_file.id, parsed_text=resume_file.parsed_text)


@router.post("/structure/{resume_id}", response_model=ResumeStructureResponse)
async def structure_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeStructureResponse:
    resume_file = _get_owned_resume_file(db, current_user, resume_id)
    if resume_file.status not in {"parsed", "structured", "structure_failed"} or not resume_file.parsed_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Resume text has not been extracted",
        )

    llm_client = build_llm_client(get_settings())
    try:
        structure = await structure_resume_text(llm_client, resume_file.parsed_text)
    except ResumeStructureError as exc:
        _record_structure_failure(db, resume_file, str(exc))
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except LLMProviderError as exc:
        _record_structure_failure(db, resume_file, str(exc))
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    profile = apply_resume_structure(db, current_user, structure)
    follow_up_questions = [question.strip() for question in structure.follow_up_questions if question.strip()]
    conversation = _create_resume_follow_up_conversation(db, current_user, follow_up_questions)
    resume_file.structured_payload = structure.model_dump(mode="json")
    resume_file.structure_error = None
    resume_file.structured_at = datetime.now(timezone.utc)
    resume_file.status = "structured"
    db.add(resume_file)
    db.add(conversation)
    db.commit()
    db.refresh(profile)
    db.refresh(resume_file)
    db.refresh(conversation)
    return ResumeStructureResponse(
        id=resume_file.id,
        status=resume_file.status,
        structure_error=resume_file.structure_error,
        structured_at=resume_file.structured_at,
        profile=_profile_response(profile),
        conversation_id=conversation.id,
        follow_up_questions=follow_up_questions,
    )


def _get_owned_resume_file(db: Session, current_user: User, resume_id: str) -> ResumeFile:
    resume_file = db.execute(
        select(ResumeFile).where(ResumeFile.id == resume_id, ResumeFile.user_id == current_user.id)
    ).scalar_one_or_none()
    if resume_file is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume file not found")
    return resume_file


def _record_structure_failure(db: Session, resume_file: ResumeFile, message: str) -> None:
    resume_file.status = "structure_failed"
    resume_file.structure_error = message
    resume_file.structured_at = None
    db.add(resume_file)
    db.commit()


def _create_resume_follow_up_conversation(
    db: Session,
    current_user: User,
    follow_up_questions: list[str],
) -> Conversation:
    questions = follow_up_questions or ["What parts of this resume should we strengthen first?"]
    assistant_content = "I imported your resume into your CareerPal profile."
    if questions:
        assistant_content = f"{assistant_content}\n\n" + "\n".join(f"- {question}" for question in questions)
    conversation = Conversation(
        user_id=current_user.id,
        context_type="career",
        focus_node="resume",
        messages=[
            {
                "role": "assistant",
                "content": assistant_content,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ],
    )
    db.add(conversation)
    return conversation


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


async def store_validated_resume(file, storage_path: Path, max_upload_bytes: int, suffix: str) -> int:
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
        if not _has_valid_resume_content(temp_path, suffix):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Unsupported resume file type. Upload a valid PDF or DOCX file.",
            )

        storage_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path.replace(storage_path)
        temp_path = None
        return total_bytes
    finally:
        if temp_path is not None and temp_path.exists():
            temp_path.unlink()


def _has_valid_resume_content(path: Path, suffix: str) -> bool:
    if suffix == ".pdf":
        return path.read_bytes()[:5] == b"%PDF-"
    if suffix == ".docx":
        try:
            with zipfile.ZipFile(path) as archive:
                names = set(archive.namelist())
        except zipfile.BadZipFile:
            return False
        return "[Content_Types].xml" in names and "word/document.xml" in names
    return False
