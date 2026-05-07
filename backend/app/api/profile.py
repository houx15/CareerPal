from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.user import Certificate, Education, Experience, Profile, Project, Skill, User
from app.schemas.profile import (
    CertificateItem,
    EducationItem,
    ExperienceItem,
    ProfileCompleteness,
    ProfileResponse,
    ProfileUpdate,
    ProjectItem,
    SkillItem,
)

router = APIRouter(prefix="/profile", tags=["profile"])


def _profile_response(profile: Profile) -> ProfileResponse:
    return ProfileResponse(
        updated_at=profile.updated_at,
        name=profile.name,
        phone=profile.phone,
        contact_email=profile.contact_email,
        location=profile.location,
        headline=profile.headline,
        target_direction=profile.target_direction,
        comment=profile.comment,
        education=[
            EducationItem(
                school=item.school,
                degree=item.degree,
                time=item.time,
                comment=item.comment,
            )
            for item in sorted(profile.education_items, key=lambda item: item.sort_order)
        ],
        experience=[
            ExperienceItem(
                company=item.company,
                role=item.role,
                time=item.time,
                description=item.description,
                achievements=item.achievements,
                comment=item.comment,
            )
            for item in sorted(profile.experience_items, key=lambda item: item.sort_order)
        ],
        projects=[
            ProjectItem(
                name=item.name,
                description=item.description,
                tech_stack=item.tech_stack,
                achievements=item.achievements,
                link=item.link,
                comment=item.comment,
                completeness=item.completeness,
            )
            for item in sorted(profile.project_items, key=lambda item: item.sort_order)
        ],
        skills=[
            SkillItem(
                name=item.name,
                category=item.category,
                proficiency=item.proficiency,
                comment=item.comment,
            )
            for item in sorted(profile.skill_items, key=lambda item: item.sort_order)
        ],
        certificates=[
            CertificateItem(
                name=item.name,
                issuer=item.issuer,
                date=item.date,
                comment=item.comment,
            )
            for item in sorted(profile.certificate_items, key=lambda item: item.sort_order)
        ],
    )


def _current_profile(current_user: User, db: Session) -> Profile:
    if current_user.profile is None:
        current_user.profile = Profile(user_id=current_user.id)
        db.add(current_user.profile)
        db.commit()
        db.refresh(current_user)
    return current_user.profile


def _has_text(value: str | None) -> bool:
    return bool(value and value.strip())


def _fields_state(values: list[str | None]) -> str:
    present_count = sum(1 for value in values if _has_text(value))
    if present_count == len(values):
        return "complete"
    if present_count > 0:
        return "partial"
    return "empty"


def _items_state(items: list, is_complete) -> str:
    if any(is_complete(item) for item in items):
        return "complete"
    if items:
        return "partial"
    return "empty"


@router.get("", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ProfileResponse:
    return _profile_response(_current_profile(current_user, db))


@router.patch("", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    profile = _current_profile(current_user, db)
    updates = payload.model_dump(exclude_unset=True)
    education = updates.pop("education", None)
    experience = updates.pop("experience", None)
    projects = updates.pop("projects", None)
    skills = updates.pop("skills", None)
    certificates = updates.pop("certificates", None)
    for field, value in updates.items():
        setattr(profile, field, value)
    if education is not None:
        profile.education_items = [
            Education(
                school=item["school"],
                degree=item["degree"],
                time=item["time"],
                comment=item.get("comment"),
                sort_order=index,
            )
            for index, item in enumerate(education)
        ]
        profile.updated_at = datetime.now(timezone.utc)
    if experience is not None:
        profile.experience_items = [
            Experience(
                company=item["company"],
                role=item["role"],
                time=item["time"],
                description=item.get("description", ""),
                achievements=item.get("achievements", []),
                comment=item.get("comment"),
                sort_order=index,
            )
            for index, item in enumerate(experience)
        ]
        profile.updated_at = datetime.now(timezone.utc)
    if projects is not None:
        profile.project_items = [
            Project(
                name=item["name"],
                description=item.get("description", ""),
                tech_stack=item.get("tech_stack", []),
                achievements=item.get("achievements", []),
                link=item.get("link"),
                comment=item.get("comment"),
                completeness=item.get("completeness") or _project_item_completeness(item),
                sort_order=index,
            )
            for index, item in enumerate(projects)
        ]
        profile.updated_at = datetime.now(timezone.utc)
    if skills is not None:
        profile.skill_items = [
            Skill(
                name=item["name"],
                category=item["category"],
                proficiency=item["proficiency"],
                comment=item.get("comment"),
                sort_order=index,
            )
            for index, item in enumerate(skills)
        ]
        profile.updated_at = datetime.now(timezone.utc)
    if certificates is not None:
        profile.certificate_items = [
            Certificate(
                name=item["name"],
                issuer=item["issuer"],
                date=item["date"],
                comment=item.get("comment"),
                sort_order=index,
            )
            for index, item in enumerate(certificates)
        ]
        profile.updated_at = datetime.now(timezone.utc)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _profile_response(profile)


@router.get("/completeness", response_model=ProfileCompleteness)
def get_profile_completeness(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileCompleteness:
    profile = _current_profile(current_user, db)
    basics = _fields_state([profile.name, profile.headline, profile.target_direction])
    contact = _fields_state([profile.phone, profile.contact_email, profile.location])
    summary = "complete" if _has_text(profile.comment) else "empty"
    education = _items_state(
        profile.education_items,
        lambda item: _has_text(item.school) and _has_text(item.degree) and _has_text(item.time),
    )
    experience = _items_state(
        profile.experience_items,
        lambda item: _has_text(item.company)
        and _has_text(item.role)
        and _has_text(item.time)
        and _has_text(item.description)
        and any(_has_text(achievement) for achievement in item.achievements),
    )
    projects = _items_state(
        profile.project_items,
        lambda item: _has_text(item.name)
        and _has_text(item.description)
        and any(_has_text(tech) for tech in item.tech_stack)
        and any(_has_text(achievement) for achievement in item.achievements),
    )
    skills = _items_state(
        profile.skill_items,
        lambda item: _has_text(item.name)
        and _has_text(item.category)
        and item.proficiency in {"beginner", "intermediate", "advanced", "expert"},
    )
    certificates = _items_state(
        profile.certificate_items,
        lambda item: _has_text(item.name) and _has_text(item.issuer) and item.date is not None,
    )
    sections = {
        "basics": basics,
        "contact": contact,
        "summary": summary,
        "experience": experience,
        "skills": skills,
        "projects": projects,
        "education": education,
        "certificates": certificates,
    }
    dashboard_sections = ["basics", "summary", "experience", "skills", "projects", "education", "certificates"]
    if all(sections[section] == "complete" for section in dashboard_sections):
        overall = "complete"
    elif any(state != "empty" for state in sections.values()):
        overall = "partial"
    else:
        overall = "empty"
    return ProfileCompleteness(overall=overall, sections=sections)


def _project_item_completeness(item: dict) -> str:
    has_name = bool(item["name"].strip())
    has_description = bool(item.get("description", "").strip())
    has_tech = any(tech.strip() for tech in item.get("tech_stack", []))
    has_achievement = any(achievement.strip() for achievement in item.get("achievements", []))
    if has_name and has_description and has_tech and has_achievement:
        return "complete"
    if any([has_name, has_description, has_tech, has_achievement]):
        return "partial"
    return "sparse"
