import json
import re
from collections.abc import Sequence

from app.models.user import Profile
from app.services.llm import LLMClient, LLMMessage

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


class MatchAnalysisError(RuntimeError):
    pass


def analyze_job_description(profile: Profile, job_description: str, llm_client: LLMClient | None = None) -> dict[str, object]:
    clean_jd = job_description.strip()
    if llm_client is not None:
        return _analyze_with_llm(profile, clean_jd, llm_client)
    return heuristic_job_description_analysis(profile, clean_jd)


def heuristic_job_description_analysis(profile: Profile, job_description: str) -> dict[str, object]:
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


def _analyze_with_llm(profile: Profile, job_description: str, llm_client: LLMClient) -> dict[str, object]:
    return _parse_llm_match_payload(_collect_stream(llm_client, _llm_messages(profile, job_description)), job_description)


def _collect_stream(llm_client: LLMClient, messages: Sequence[LLMMessage]) -> str:
    import anyio

    async def collect() -> str:
        chunks = []
        async for chunk in llm_client.stream_chat(messages):
            chunks.append(chunk)
        return "".join(chunks)

    return anyio.run(collect)


def _llm_messages(profile: Profile, job_description: str) -> list[LLMMessage]:
    profile_context_json = json.dumps(_profile_prompt_context(profile), ensure_ascii=True)
    return [
        LLMMessage(
            role="system",
            content=(
                "You are CareerPal's match analyst for university students. "
                "Compare the current profile against the pasted job description. "
                "Return only JSON with these fields: company, role, score, strengths, gaps, suggestions. "
                "score must be an integer from 0 to 100. strengths, gaps, and suggestions must be arrays "
                "of concise strings. Never invent profile evidence; identify gaps when evidence is missing.\n\n"
                f"Current student's profile JSON:\n{profile_context_json}"
            ),
        ),
        LLMMessage(role="user", content=f"Job description:\n{job_description}"),
    ]


def _profile_prompt_context(profile: Profile) -> dict[str, object]:
    return {
        "name": profile.name,
        "phone": profile.phone,
        "contact_email": profile.contact_email,
        "location": profile.location,
        "headline": profile.headline,
        "target_direction": profile.target_direction,
        "comment": profile.comment,
        "education": [
            {
                "school": item.school,
                "degree": item.degree,
                "time": item.time,
                "comment": item.comment,
            }
            for item in profile.education_items
        ],
        "experience": [
            {
                "company": item.company,
                "role": item.role,
                "time": item.time,
                "description": item.description,
                "achievements": item.achievements,
                "comment": item.comment,
            }
            for item in profile.experience_items
        ],
        "projects": [
            {
                "name": item.name,
                "description": item.description,
                "tech_stack": item.tech_stack,
                "achievements": item.achievements,
                "link": item.link,
                "comment": item.comment,
                "completeness": item.completeness,
            }
            for item in profile.project_items
        ],
        "skills": [
            {
                "name": item.name,
                "category": item.category,
                "proficiency": item.proficiency,
                "comment": item.comment,
            }
            for item in profile.skill_items
        ],
        "certificates": [
            {
                "name": item.name,
                "issuer": item.issuer,
                "date": item.date.isoformat(),
                "comment": item.comment,
            }
            for item in profile.certificate_items
        ],
    }


def _parse_llm_match_payload(raw_payload: str, job_description: str) -> dict[str, object]:
    try:
        payload = json.loads(_extract_json_object(raw_payload))
    except (json.JSONDecodeError, MatchAnalysisError) as exc:
        raise MatchAnalysisError("LLM provider returned invalid match analysis") from exc
    if not isinstance(payload, dict):
        raise MatchAnalysisError("LLM provider returned invalid match analysis")

    score = payload.get("score")
    if type(score) is not int:
        raise MatchAnalysisError("LLM provider returned invalid match analysis")

    return {
        "job_description": job_description,
        "company": _clean_optional_string(payload.get("company")),
        "role": _clean_optional_string(payload.get("role")),
        "score": max(0, min(score, 100)),
        "strengths": _clean_string_list(payload.get("strengths")),
        "gaps": _clean_string_list(payload.get("gaps")),
        "suggestions": _clean_string_list(payload.get("suggestions")),
    }


def _extract_json_object(raw_payload: str) -> str:
    stripped = raw_payload.strip()
    if stripped.startswith("{") and stripped.endswith("}"):
        return stripped
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise MatchAnalysisError("LLM provider returned invalid match analysis")
    return stripped[start : end + 1]


def _clean_optional_string(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    return cleaned[:255] or None


def _clean_string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        raise MatchAnalysisError("LLM provider returned invalid match analysis")
    cleaned = [item.strip()[:500] for item in value if isinstance(item, str) and item.strip()]
    if not cleaned:
        raise MatchAnalysisError("LLM provider returned invalid match analysis")
    return cleaned[:8]


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
