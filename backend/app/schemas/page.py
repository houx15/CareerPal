from datetime import datetime
from typing import Literal

from pydantic import BaseModel

StyleTemplate = Literal["clean-professional", "modern-creative", "technical"]


class GeneratePageRequest(BaseModel):
    style_template: StyleTemplate


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
