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


class ExperienceItem(BaseModel):
    company: str = Field(max_length=255)
    role: str = Field(max_length=255)
    time: str = Field(max_length=120)
    description: str = ""
    achievements: list[str] = Field(default_factory=list)
    comment: str | None = None


class ExperienceItemUpdate(ExperienceItem):
    model_config = ConfigDict(extra="forbid")


class ProjectItem(BaseModel):
    name: str = Field(max_length=255)
    description: str = ""
    tech_stack: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    link: str | None = Field(default=None, max_length=500)
    comment: str | None = None
    completeness: Literal["sparse", "partial", "complete"] = "partial"


class ProjectItemUpdate(ProjectItem):
    model_config = ConfigDict(extra="forbid")


SkillProficiency = Literal["beginner", "intermediate", "advanced", "expert"]


class SkillItem(BaseModel):
    name: str = Field(max_length=255)
    category: str = Field(max_length=255)
    proficiency: SkillProficiency
    comment: str | None = None


class SkillItemUpdate(SkillItem):
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
    experience: list[ExperienceItem] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    skills: list[SkillItem] = Field(default_factory=list)
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
    experience: list[ExperienceItemUpdate] | None = None
    projects: list[ProjectItemUpdate] | None = None
    skills: list[SkillItemUpdate] | None = None


CompletenessState = Literal["empty", "partial", "complete"]


class ProfileCompleteness(BaseModel):
    overall: CompletenessState
    sections: dict[str, CompletenessState]
