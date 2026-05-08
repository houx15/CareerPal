from datetime import datetime

from pydantic import BaseModel


class ResumeUploadResponse(BaseModel):
    id: str
    original_filename: str
    content_type: str
    size_bytes: int
    status: str
    parse_error: str | None = None
    parsed_at: datetime | None = None
    created_at: datetime


class ResumeParseStatusResponse(BaseModel):
    id: str
    status: str
    parse_error: str | None = None
    parsed_at: datetime | None = None


class ResumeParsedTextResponse(BaseModel):
    id: str
    parsed_text: str
