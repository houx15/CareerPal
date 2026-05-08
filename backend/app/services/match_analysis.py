import re

from app.models.user import Profile

KEYWORDS = [
    "python",
    "fastapi",
    "react",
    "typescript",
    "javascript",
    "postgresql",
    "sql",
    "aws",
    "docker",
    "kubernetes",
    "llm",
    "machine learning",
    "data",
    "backend",
    "frontend",
    "design",
]


def analyze_job_description(profile: Profile, job_description: str) -> dict[str, object]:
    clean_jd = job_description.strip()
    role = _detect_label(clean_jd, ["role", "job title", "position", "title"]) or _detect_role_at_company(clean_jd)[0]
    company = _detect_label(clean_jd, ["company", "organization"]) or _detect_role_at_company(clean_jd)[1]
    jd_keywords = _keywords_in(clean_jd)
    profile_text = _profile_text(profile)
    profile_keywords = _keywords_in(profile_text)
    matched = [keyword for keyword in jd_keywords if keyword in profile_keywords]
    missing = [keyword for keyword in jd_keywords if keyword not in profile_keywords]

    score = 50
    score += min(len(matched), 3) * 8
    if role and _has_overlap(profile.target_direction or "", f"{role} {clean_jd}"):
        score += 8
    if any(_has_overlap(_project_text(project), clean_jd) for project in profile.project_items):
        score += 6
    if any(_has_overlap(_experience_text(experience), clean_jd) for experience in profile.experience_items):
        score += 6
    score = max(45, min(score, 95))

    strengths = [f"Profile includes {_display(keyword)}." for keyword in matched[:3]]
    if not strengths and profile.experience_items:
        strengths.append("Profile has structured experience to compare against.")
    if not strengths:
        strengths.append("Profile has baseline career data to compare against.")

    gaps = [f"Add evidence for {_display(keyword)}." for keyword in missing[:3]]
    if not gaps:
        gaps.append("Add more role-specific evidence from projects or experience.")

    suggestions = []
    if role:
        suggestions.append(f"Tailor the headline toward {role}.")
    suggestions.append("Quantify impact in your most relevant experience.")
    if missing:
        suggestions.append(f"Add a project bullet that demonstrates {_display(missing[0])}.")

    return {
        "job_description": clean_jd,
        "company": company,
        "role": role,
        "score": score,
        "strengths": strengths,
        "gaps": gaps,
        "suggestions": suggestions,
    }


def _detect_label(text: str, labels: list[str]) -> str | None:
    for line in text.splitlines():
        for label in labels:
            match = re.match(rf"\s*{re.escape(label)}\s*:\s*(.+?)\s*$", line, flags=re.IGNORECASE)
            if match:
                return match.group(1).strip()[:255]
    return None


def _detect_role_at_company(text: str) -> tuple[str | None, str | None]:
    first_line = next((line.strip() for line in text.splitlines() if line.strip()), "")
    match = re.match(r"(.+?)\s+at\s+([A-Z][A-Za-z0-9 &.-]{1,80})\s*$", first_line)
    if not match:
        return None, None
    return match.group(1).strip()[:255], match.group(2).strip()[:255]


def _keywords_in(text: str) -> list[str]:
    lower = text.lower()
    return [keyword for keyword in KEYWORDS if re.search(rf"\b{re.escape(keyword)}\b", lower)]


def _profile_text(profile: Profile) -> str:
    parts = [
        profile.name,
        profile.headline,
        profile.target_direction,
        profile.comment,
        *[_project_text(project) for project in profile.project_items],
        *[_experience_text(experience) for experience in profile.experience_items],
        *[f"{skill.name} {skill.category} {skill.proficiency} {skill.comment or ''}" for skill in profile.skill_items],
    ]
    return " ".join(part for part in parts if part)


def _project_text(project) -> str:
    return " ".join([project.name, project.description, " ".join(project.tech_stack), " ".join(project.achievements), project.comment or ""])


def _experience_text(experience) -> str:
    return " ".join([experience.company, experience.role, experience.description, " ".join(experience.achievements), experience.comment or ""])


def _has_overlap(left: str, right: str) -> bool:
    left_tokens = {token for token in re.findall(r"[a-z0-9]+", left.lower()) if len(token) > 2}
    right_tokens = {token for token in re.findall(r"[a-z0-9]+", right.lower()) if len(token) > 2}
    return bool(left_tokens & right_tokens)


def _display(keyword: str) -> str:
    return {"sql": "SQL", "aws": "AWS", "llm": "LLM"}.get(keyword, keyword.title())
