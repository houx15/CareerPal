from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.user import Profile, User
from app.schemas.profile import ProfileCompleteness, ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


def _profile_response(profile: Profile) -> ProfileResponse:
    return ProfileResponse(
        name=profile.name,
        headline=profile.headline,
        target_direction=profile.target_direction,
        comment=profile.comment,
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
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
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
    sections = {
        "basics": basics,
        "summary": "empty",
        "experience": "empty",
        "skills": "empty",
        "projects": "empty",
        "education": "empty",
    }
    overall = "partial" if any(state != "empty" for state in sections.values()) else "empty"
    return ProfileCompleteness(overall=overall, sections=sections)
