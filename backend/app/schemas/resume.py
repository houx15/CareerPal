from datetime import datetime

from pydantic import BaseModel


class ResumeUploadResponse(BaseModel):
    id: str
    original_filename: str
    content_type: str
    size_bytes: int
    status: str
    created_at: datetime
