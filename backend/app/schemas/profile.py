from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class EducationItem(BaseModel):
    school: str = Field(max_length=255)
    degree: str = Field(max_length=255)
    time: str = Field(max_length=120)
    comment: str | None = None


class EducationItemUpdate(EducationItem):
    model_config = ConfigDict(extra="forbid")


class ProfileResponse(BaseModel):
    updated_at: datetime
    name: str | None = None
    phone: str | None = None
    contact_email: str | None = None
    location: str | None = None
    headline: str | None = None
    target_direction: str | None = None
    comment: str | None = None
    education: list[EducationItem] = Field(default_factory=list)
    experience: list[dict] = Field(default_factory=list)
    projects: list[dict] = Field(default_factory=list)
    skills: list[dict] = Field(default_factory=list)
    certificates: list[dict] = Field(default_factory=list)


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    phone: str | None = None
    contact_email: str | None = None
    location: str | None = None
    headline: str | None = None
    target_direction: str | None = None
    comment: str | None = None
    education: list[EducationItemUpdate] | None = None


CompletenessState = Literal["empty", "partial", "complete"]


class ProfileCompleteness(BaseModel):
    overall: CompletenessState
    sections: dict[str, CompletenessState]
