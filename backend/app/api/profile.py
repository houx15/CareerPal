from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.user import Education, Profile, User
from app.schemas.profile import EducationItem, ProfileCompleteness, ProfileResponse, ProfileUpdate

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
    )


def _current_profile(current_user: User, db: Session) -> Profile:
    if current_user.profile is None:
        current_user.profile = Profile(user_id=current_user.id)
        db.add(current_user.profile)
        db.commit()
        db.refresh(current_user)
    return current_user.profile


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
    basics = "partial" if any([profile.name, profile.headline, profile.target_direction]) else "empty"
    has_education = bool(profile.education_items)
    has_complete_education = any(
        item.school.strip() and item.degree.strip() and item.time.strip() for item in profile.education_items
    )
    education = "complete" if has_complete_education else "partial" if has_education else "empty"
    sections = {
        "basics": basics,
        "summary": "empty",
        "experience": "empty",
        "skills": "empty",
        "projects": "empty",
        "education": education,
    }
    overall = "partial" if any(state != "empty" for state in sections.values()) else "empty"
    return ProfileCompleteness(overall=overall, sections=sections)
