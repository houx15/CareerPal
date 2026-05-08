import json
import re
from collections.abc import Sequence
from datetime import date as Date, datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy.orm import Session

from app.models.user import Certificate, Education, Experience, Profile, Project, Skill, User
from app.services.llm import LLMClient, LLMMessage


class ResumeStructureError(RuntimeError):
    pass


class StructuredEducation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    school: str = Field(default="", max_length=255)
    degree: str = Field(default="", max_length=255)
    time: str = Field(default="", max_length=120)
    comment: str | None = None


class StructuredExperience(BaseModel):
    model_config = ConfigDict(extra="ignore")

    company: str = Field(default="", max_length=255)
    role: str = Field(default="", max_length=255)
    time: str = Field(default="", max_length=120)
    description: str = ""
    achievements: list[str] = Field(default_factory=list)
    comment: str | None = None


class StructuredProject(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(default="", max_length=255)
    description: str = ""
    tech_stack: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    link: str | None = Field(default=None, max_length=500)
    comment: str | None = None


class StructuredSkill(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(default="", max_length=255)
    category: str = Field(default="General", max_length=255)
    proficiency: str = "intermediate"
    comment: str | None = None


class StructuredCertificate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(default="", max_length=255)
    issuer: str = Field(default="", max_length=255)
    date: Date | None = None
    comment: str | None = None


class StructuredProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = None
    phone: str | None = None
    contact_email: str | None = None
    location: str | None = None
    headline: str | None = None
    target_direction: str | None = None
    comment: str | None = None


class ResumeStructure(BaseModel):
    model_config = ConfigDict(extra="ignore")

    profile: StructuredProfile = Field(default_factory=StructuredProfile)
    education: list[StructuredEducation] = Field(default_factory=list)
    experience: list[StructuredExperience] = Field(default_factory=list)
    projects: list[StructuredProject] = Field(default_factory=list)
    skills: list[StructuredSkill] = Field(default_factory=list)
    certificates: list[StructuredCertificate] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)


RESUME_STRUCTURE_SYSTEM_PROMPT = """You structure student resume text for CareerPal.

Return only JSON. Do not wrap it in Markdown.
Only include facts explicitly present in the resume text. Never fabricate.
Use this JSON shape:
{
  "profile": {
    "name": string|null,
    "phone": string|null,
    "contact_email": string|null,
    "location": string|null,
    "headline": string|null,
    "target_direction": string|null,
    "comment": string|null
  },
  "education": [{"school": string, "degree": string, "time": string, "comment": string|null}],
  "experience": [{
    "company": string,
    "role": string,
    "time": string,
    "description": string,
    "achievements": [string],
    "comment": string|null
  }],
  "projects": [{
    "name": string,
    "description": string,
    "tech_stack": [string],
    "achievements": [string],
    "link": string|null,
    "comment": string|null
  }],
  "skills": [{"name": string, "category": string, "proficiency": "beginner|intermediate|advanced|expert"}],
  "certificates": [{"name": string, "issuer": string, "date": "YYYY-MM-DD", "comment": string|null}],
  "follow_up_questions": [string]
}
"""


async def structure_resume_text(llm_client: LLMClient, parsed_text: str) -> ResumeStructure:
    messages = [
        LLMMessage(role="system", content=RESUME_STRUCTURE_SYSTEM_PROMPT),
        LLMMessage(role="user", content=f"Structure this resume text JSON for CareerPal:\n\n{parsed_text}"),
    ]
    raw_response = ""
    async for chunk in llm_client.stream_chat(messages):
        raw_response += chunk
    return parse_resume_structure(raw_response)


def parse_resume_structure(raw_response: str) -> ResumeStructure:
    try:
        payload = json.loads(_json_text(raw_response))
        return ResumeStructure.model_validate(payload)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise ResumeStructureError("LLM response was not valid resume structure JSON") from exc


def apply_resume_structure(db: Session, user: User, structure: ResumeStructure) -> Profile:
    profile = user.profile
    changed = False
    if profile is None:
        profile = Profile(user_id=user.id)
        user.profile = profile
        db.add(profile)
        changed = True

    profile_payload = structure.profile.model_dump()
    for field, value in profile_payload.items():
        if _has_text(value) and getattr(profile, field) != value.strip():
            setattr(profile, field, value.strip())
            changed = True

    education_items = [
        Education(
            school=item.school.strip(),
            degree=item.degree.strip(),
            time=item.time.strip(),
            comment=_clean_optional(item.comment),
            sort_order=index,
        )
        for index, item in enumerate(structure.education)
        if _has_text(item.school) and _has_text(item.degree) and _has_text(item.time)
    ]
    if education_items:
        profile.education_items = education_items
        changed = True

    experience_items = [
        Experience(
            company=item.company.strip(),
            role=item.role.strip(),
            time=item.time.strip(),
            description=item.description.strip(),
            achievements=_clean_list(item.achievements),
            comment=_clean_optional(item.comment),
            sort_order=index,
        )
        for index, item in enumerate(structure.experience)
        if _has_text(item.company) and _has_text(item.role) and _has_text(item.time)
    ]
    if experience_items:
        profile.experience_items = experience_items
        changed = True

    project_items = [
        Project(
            name=item.name.strip(),
            description=item.description.strip(),
            tech_stack=_clean_list(item.tech_stack),
            achievements=_clean_list(item.achievements),
            link=_clean_optional(item.link),
            comment=_clean_optional(item.comment),
            completeness=_project_completeness(item),
            sort_order=index,
        )
        for index, item in enumerate(structure.projects)
        if _has_text(item.name)
    ]
    if project_items:
        profile.project_items = project_items
        changed = True

    skill_items = [
        Skill(
            name=item.name.strip(),
            category=item.category.strip() if _has_text(item.category) else "General",
            proficiency=_skill_proficiency(item.proficiency),
            comment=_clean_optional(item.comment),
            sort_order=index,
        )
        for index, item in enumerate(structure.skills)
        if _has_text(item.name)
    ]
    if skill_items:
        profile.skill_items = skill_items
        changed = True

    certificate_items = [
        Certificate(
            name=item.name.strip(),
            issuer=item.issuer.strip(),
            date=item.date,
            comment=_clean_optional(item.comment),
            sort_order=index,
        )
        for index, item in enumerate(structure.certificates)
        if _has_text(item.name) and _has_text(item.issuer) and item.date is not None
    ]
    if certificate_items:
        profile.certificate_items = certificate_items
        changed = True

    if changed:
        profile.updated_at = datetime.now(timezone.utc)
    db.add(profile)
    return profile


def _json_text(raw_response: str) -> str:
    trimmed = raw_response.strip()
    fenced = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", trimmed, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        return fenced.group(1)
    return trimmed


def _has_text(value: str | None) -> bool:
    return bool(value and value.strip())


def _clean_optional(value: str | None) -> str | None:
    return value.strip() if _has_text(value) else None


def _clean_list(values: Sequence[str]) -> list[str]:
    return [value.strip() for value in values if _has_text(value)]


def _skill_proficiency(value: str) -> str:
    return value if value in {"beginner", "intermediate", "advanced", "expert"} else "intermediate"


def _project_completeness(project: StructuredProject) -> str:
    if (
        _has_text(project.name)
        and _has_text(project.description)
        and _clean_list(project.tech_stack)
        and _clean_list(project.achievements)
    ):
        return "complete"
    if _has_text(project.name) or _has_text(project.description) or _clean_list(project.tech_stack):
        return "partial"
    return "sparse"
