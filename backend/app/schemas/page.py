from datetime import datetime

from pydantic import BaseModel


class GeneratedPagePreview(BaseModel):
    id: str
    html_content: str
    style_template: str
    version: int
    is_public: bool
    created_at: datetime


class GeneratedPageVersion(BaseModel):
    id: str
    style_template: str
    version: int
    is_public: bool
    created_at: datetime


class GeneratedPageVersionsResponse(BaseModel):
    versions: list[GeneratedPageVersion]
