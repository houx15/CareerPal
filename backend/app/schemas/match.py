from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class JobDescriptionAnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_description: str = Field(max_length=20000)

    @field_validator("job_description")
    @classmethod
    def job_description_must_not_be_blank(cls, value: Any) -> str:
        if not isinstance(value, str):
            raise ValueError("Job description must be a string")
        stripped = value.strip()
        if not stripped:
            raise ValueError("Job description must not be blank")
        return stripped


class JobDescriptionAnalysisResponse(BaseModel):
    id: str
    job_description: str
    company: str | None
    role: str | None
    score: int
    strengths: list[str]
    gaps: list[str]
    suggestions: list[str]
    created_at: datetime
    updated_at: datetime


class JobDescriptionHistoryResponse(BaseModel):
    analyses: list[JobDescriptionAnalysisResponse]
