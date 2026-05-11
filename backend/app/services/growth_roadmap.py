import json
from collections.abc import Sequence

from app.models.match import JobDescriptionAnalysis
from app.models.user import Profile
from app.schemas.growth import GrowthPlanUpsert
from app.services.llm import LLMClient, LLMMessage
from app.services.match_analysis import _profile_prompt_context


class GrowthRoadmapError(RuntimeError):
    pass


def generate_growth_roadmap(
    profile: Profile,
    analysis: JobDescriptionAnalysis,
    llm_client: LLMClient,
) -> GrowthPlanUpsert:
    raw_payload = _collect_stream(llm_client, _llm_messages(profile, analysis))
    return _parse_growth_payload(raw_payload)


def _collect_stream(llm_client: LLMClient, messages: Sequence[LLMMessage]) -> str:
    import anyio

    async def collect() -> str:
        chunks = []
        async for chunk in llm_client.stream_chat(messages):
            chunks.append(chunk)
        return "".join(chunks)

    return anyio.run(collect)


def _llm_messages(profile: Profile, analysis: JobDescriptionAnalysis) -> list[LLMMessage]:
    profile_context_json = json.dumps(_profile_prompt_context(profile), ensure_ascii=True)
    match_context_json = json.dumps(
        {
            "job_description": analysis.job_description,
            "company": analysis.company,
            "role": analysis.role,
            "score": analysis.score,
            "strengths": analysis.strengths,
            "gaps": analysis.gaps,
            "suggestions": analysis.suggestions,
        },
        ensure_ascii=True,
    )
    return [
        LLMMessage(
            role="system",
            content=(
                "You are CareerPal's growth roadmap strategist for university students. "
                "Generate an actionable growth roadmap from the current profile and job match analysis. "
                "Return only JSON with fields: goal, nodes. "
                "nodes must be an array of objects with: id, label, state, quality, parent, x, y. "
                "state must be one of: done, active, locked. quality must be a number from 0 to 1. "
                "parent must be null for the root and otherwise reference an existing node id. "
                "Use done for existing evidence, active for immediate next steps, and locked for later dependent work. "
                "Do not invent profile evidence.\n\n"
                f"Current student's profile JSON:\n{profile_context_json}"
            ),
        ),
        LLMMessage(role="user", content=f"Match analysis JSON:\n{match_context_json}"),
    ]


def _parse_growth_payload(raw_payload: str) -> GrowthPlanUpsert:
    try:
        payload = json.loads(_extract_json_object(raw_payload))
        if not isinstance(payload, dict):
            raise GrowthRoadmapError("LLM provider returned invalid growth roadmap")
        return GrowthPlanUpsert(**payload)
    except (TypeError, ValueError, json.JSONDecodeError, GrowthRoadmapError) as exc:
        raise GrowthRoadmapError("LLM provider returned invalid growth roadmap") from exc


def _extract_json_object(raw_payload: str) -> str:
    stripped = raw_payload.strip()
    if stripped.startswith("{") and stripped.endswith("}"):
        return stripped
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise GrowthRoadmapError("LLM provider returned invalid growth roadmap")
    return stripped[start : end + 1]
