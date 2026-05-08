import re
from collections.abc import Mapping

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import Profile, User


PROFILE_FIELDS = {
    "headline": "headline",
    "target direction": "target_direction",
    "target_direction": "target_direction",
    "location": "location",
    "phone": "phone",
    "phone number": "phone",
    "contact email": "contact_email",
    "email": "contact_email",
    "comment": "comment",
    "summary": "comment",
}
PROFILE_LABEL_PATTERN = "|".join(re.escape(label) for label in sorted(PROFILE_FIELDS, key=len, reverse=True))
SUMMARY_FIELDS = {"comment"}


def extract_explicit_profile_updates(user_text: str) -> dict[str, str]:
    updates = {}
    for match in re.finditer(
        rf"(?:^|[.!?\n]\s*)my\s+(?P<label>{PROFILE_LABEL_PATTERN})\s*(?:is|=|:)\s*"
        rf"(?P<value>.+?)(?=(?:[.!?\n]\s*(?:my\s+)?(?:{PROFILE_LABEL_PATTERN})\s*(?:is|=|:))|$)",
        user_text,
        flags=re.IGNORECASE | re.DOTALL,
    ):
        label = match.group("label").lower()
        field = PROFILE_FIELDS[label]
        value = _clean_value(match.group("value"))
        if value is None:
            continue
        if field not in SUMMARY_FIELDS:
            value = _first_statement_value(field, value)
        if field == "phone" and not _looks_like_phone_update(value):
            continue
        if field == "contact_email" and "@" not in value:
            continue
        updates[field] = value
    return updates


def apply_profile_extraction(db: Session, user_id: str, user_text: str) -> dict | None:
    updates = extract_explicit_profile_updates(user_text)
    if not updates:
        return None

    user = db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise RuntimeError("User disappeared while applying extraction")

    profile = user.profile
    if profile is None:
        profile = Profile(user_id=user_id)
        db.add(profile)
        db.flush()

    changes = _apply_profile_updates(profile, updates)
    if not changes:
        return None

    db.add(profile)
    return {"profile": changes}


def _clean_value(raw_value: str) -> str | None:
    value = raw_value.strip().strip("\"'").rstrip(".!?").strip()
    return value or None


def _first_statement_value(field: str, value: str) -> str:
    if field == "contact_email":
        email_match = re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", value)
        return email_match.group(0) if email_match else value

    sentence = re.split(r"[.!?\n]", value, maxsplit=1)[0]
    return sentence.strip()


def _looks_like_phone_update(value: str) -> bool:
    return bool(re.search(r"\d", value))


def _apply_profile_updates(profile: Profile, updates: Mapping[str, str]) -> dict:
    changes = {}
    for field, after in updates.items():
        before = getattr(profile, field)
        if before == after:
            continue
        setattr(profile, field, after)
        changes[field] = {"before": before, "after": after}
    return changes
