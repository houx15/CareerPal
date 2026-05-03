from typing import Literal

from pydantic import BaseModel, Field


class ProfileResponse(BaseModel):
    name: str | None = None
    headline: str | None = None
    target_direction: str | None = None
    comment: str | None = None
    education: list[dict] = Field(default_factory=list)
    experience: list[dict] = Field(default_factory=list)
    projects: list[dict] = Field(default_factory=list)
    skills: list[dict] = Field(default_factory=list)
    certificates: list[dict] = Field(default_factory=list)


class ProfileUpdate(BaseModel):
    name: str | None = None
    headline: str | None = None
    target_direction: str | None = None
    comment: str | None = None


CompletenessState = Literal["empty", "partial", "complete"]


class ProfileCompleteness(BaseModel):
    overall: CompletenessState
    sections: dict[str, CompletenessState]
