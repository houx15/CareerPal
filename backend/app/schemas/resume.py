from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.profile import ProfileResponse

ResumeStatus = Literal["uploaded", "parsed", "parse_failed", "structured", "structure_failed"]


class ResumeUploadResponse(BaseModel):
    id: str
    original_filename: str
    content_type: str
    size_bytes: int
    status: ResumeStatus
    parse_error: str | None = None
    parsed_at: datetime | None = None
    created_at: datetime


class ResumeParseStatusResponse(BaseModel):
    id: str
    status: ResumeStatus
    parse_error: str | None = None
    parsed_at: datetime | None = None
    structure_error: str | None = None
    structured_at: datetime | None = None


class ResumeParsedTextResponse(BaseModel):
    id: str
    parsed_text: str


class ResumeStructureResponse(BaseModel):
    id: str
    status: ResumeStatus
    structure_error: str | None = None
    structured_at: datetime | None = None
    profile: ProfileResponse
    conversation_id: str
    follow_up_questions: list[str]
