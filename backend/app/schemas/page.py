from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, field_validator

StyleTemplate = Literal["clean-professional", "modern-creative", "technical"]


class GeneratePageRequest(BaseModel):
    style_template: StyleTemplate


class CustomizePageRequest(BaseModel):
    conversation_id: str
    instruction: str

    @field_validator("instruction")
    @classmethod
    def instruction_must_not_be_blank(cls, value: Any) -> str:
        if not isinstance(value, str):
            raise ValueError("Instruction must be a string")
        stripped = value.strip()
        if not stripped:
            raise ValueError("Instruction must not be blank")
        return stripped


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
