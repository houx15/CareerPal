import re
from collections.abc import Mapping

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.conversation import Conversation
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
        if _is_non_factual_scalar_value(value):
            continue
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


def reconcile_conversation_profile(db: Session, conversation: Conversation) -> dict | None:
    field_values: dict[str, list[str]] = {}
    for message in conversation.messages or []:
        if message.get("role") != "user":
            continue
        content = message.get("content")
        if not content:
            continue
        for field, value in extract_explicit_profile_updates(_normalize_correction_prefix(content)).items():
            field_values.setdefault(field, []).append(value)

    if not field_values:
        return None

    profile = _locked_profile_for_user(db, conversation.user_id)
    if profile is None:
        user = db.scalar(select(User).where(User.id == conversation.user_id))
        if user is None:
            raise RuntimeError("User disappeared while applying reconciliation")
        profile = Profile(user_id=conversation.user_id)
        db.add(profile)
        db.flush()

    updates = _reconciled_profile_updates(profile, field_values)
    if not updates:
        return None

    changes = _apply_profile_updates(profile, updates)
    if not changes:
        return None

    db.add(profile)
    return {"profile": changes}


def _locked_profile_for_user(db: Session, user_id: str) -> Profile | None:
    return db.scalar(select(Profile).where(Profile.user_id == user_id).with_for_update())


def _normalize_correction_prefix(user_text: str) -> str:
    return re.sub(r"(^|[.!?\n]\s*)actually,\s+my\s+", r"\1My ", user_text, flags=re.IGNORECASE)


def _reconciled_profile_updates(profile: Profile, field_values: Mapping[str, list[str]]) -> dict[str, str]:
    updates = {}
    for field, values in field_values.items():
        desired = values[-1]
        current = getattr(profile, field)
        if current == desired:
            continue
        if current is not None and current not in values[:-1]:
            continue
        updates[field] = desired
    return updates


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


def _is_non_factual_scalar_value(value: str) -> bool:
    normalized = re.sub(r"\s+", " ", value.strip().lower())
    if normalized in {"unknown", "none", "n/a"}:
        return True
    return (
        normalized.startswith("not important")
        or normalized.startswith("not a priority")
        or normalized.startswith("not decided")
        or normalized.startswith("not sure")
        or normalized.startswith("less important")
    )


def _apply_profile_updates(profile: Profile, updates: Mapping[str, str]) -> dict:
    changes = {}
    for field, after in updates.items():
        before = getattr(profile, field)
        if before == after:
            continue
        setattr(profile, field, after)
        changes[field] = {"before": before, "after": after}
    return changes
