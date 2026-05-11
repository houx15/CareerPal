import json
from collections.abc import AsyncIterator, Callable, Sequence
from dataclasses import dataclass
from typing import Literal, Protocol

import httpx

from app.core.config import Settings

LLMRole = Literal["system", "user", "assistant"]


@dataclass(frozen=True)
class LLMMessage:
    role: LLMRole
    content: str


class LLMClient(Protocol):
    def stream_chat(self, messages: Sequence[LLMMessage]) -> AsyncIterator[str]:
        ...


class LLMProviderError(RuntimeError):
    pass


class FakeLLMClient:
    async def stream_chat(self, messages: Sequence[LLMMessage]) -> AsyncIterator[str]:
        if any("CareerPal's match analyst" in message.content for message in messages if message.role == "system"):
            job_description = next((message.content for message in messages if message.role == "user"), "")
            yield json.dumps(_fake_match_analysis(job_description))
            return
        for chunk in [
            "I noted that. ",
            "Tell me one concrete impact or result ",
            "from that experience.",
        ]:
            yield chunk


def _fake_match_analysis(job_description: str) -> dict[str, object]:
    text = job_description.removeprefix("Job description:\n").strip()
    company = _detect_fake_label(text, ["company", "organization"]) or _detect_fake_role_at_company(text)[1]
    role = _detect_fake_label(text, ["role", "job title", "position", "title"]) or _detect_fake_role_at_company(text)[0]
    lower = text.lower()
    strengths = []
    gaps = []
    if "python" in lower:
        strengths.append("Profile includes Python.")
    if "react" in lower:
        strengths.append("Profile includes React.")
    if "sql" in lower:
        gaps.append("Add evidence for SQL.")
    if not strengths:
        strengths.append("Profile has baseline career data to compare against.")
    if not gaps:
        gaps.append("Add more role-specific evidence from projects or experience.")
    suggestions = ["Quantify impact in your most relevant experience."]
    if role:
        suggestions.insert(0, f"Tailor the headline toward {role}.")
    return {
        "company": company,
        "role": role,
        "score": 74 if gaps else 82,
        "strengths": strengths,
        "gaps": gaps,
        "suggestions": suggestions,
    }


def _detect_fake_label(text: str, labels: list[str]) -> str | None:
    for line in text.splitlines():
        for label in labels:
            prefix = f"{label}:"
            if line.lower().strip().startswith(prefix):
                return line.split(":", 1)[1].strip()[:255] or None
    return None


def _detect_fake_role_at_company(text: str) -> tuple[str | None, str | None]:
    import re

    first_line = next((line.strip() for line in text.splitlines() if line.strip()), "")
    match = re.match(r"(.+?)\s+at\s+([A-Z][A-Za-z0-9 &.-]{1,80})\s*$", first_line)
    if not match:
        return None, None
    return match.group(1).strip()[:255], match.group(2).strip()[:255]


LLMTransport = Callable[[dict], AsyncIterator[str]]


async def _httpx_stream_transport(payload: dict) -> AsyncIterator[str]:
    timeout = httpx.Timeout(connect=10.0, read=60.0, write=30.0, pool=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream(
            "POST",
            payload["url"],
            headers=payload.get("headers"),
            json=payload.get("json"),
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                yield line


class OpenAICompatibleLLMClient:
    def __init__(self, settings: Settings, transport: LLMTransport):
        self._settings = settings
        self._transport = transport

    async def stream_chat(self, messages: Sequence[LLMMessage]) -> AsyncIterator[str]:
        async for line in self._transport(
            {
                "url": f"{self._settings.llm_base_url.rstrip('/')}/chat/completions",
                "headers": {"Authorization": f"Bearer {self._settings.llm_api_key}"},
                "json": {
                    "model": self._settings.llm_model_name,
                    "messages": [{"role": message.role, "content": message.content} for message in messages],
                    "stream": True,
                },
            }
        ):
            if line == "data: [DONE]":
                break
            if not line.startswith("data: "):
                continue
            payload = parse_provider_json(line.removeprefix("data: "))
            if "error" in payload:
                raise LLMProviderError(provider_error_message(payload["error"]))
            choices = payload.get("choices") or []
            if not choices:
                continue
            content = choices[0].get("delta", {}).get("content")
            if content:
                yield content


class AnthropicLLMClient:
    def __init__(self, settings: Settings, transport: LLMTransport):
        self._settings = settings
        self._transport = transport

    async def stream_chat(self, messages: Sequence[LLMMessage]) -> AsyncIterator[str]:
        system = "\n\n".join(message.content for message in messages if message.role == "system")
        provider_messages = [
            {"role": message.role, "content": message.content}
            for message in messages
            if message.role in {"user", "assistant"}
        ]
        current_event: str | None = None
        async for line in self._transport(
            {
                "url": f"{self._settings.llm_base_url.rstrip('/')}/messages",
                "headers": {"x-api-key": self._settings.llm_api_key, "anthropic-version": "2023-06-01"},
                "json": {
                    "model": self._settings.llm_model_name,
                    "system": system,
                    "messages": provider_messages,
                    "stream": True,
                    "max_tokens": 1024,
                },
            }
        ):
            if line == "event: message_stop":
                break
            if line.startswith("event: "):
                current_event = line.removeprefix("event: ")
                continue
            if not line.startswith("data: "):
                continue
            payload = parse_provider_json(line.removeprefix("data: "))
            if current_event == "error" or "error" in payload:
                raise LLMProviderError(provider_error_message(payload.get("error", payload)))
            content = payload.get("delta", {}).get("text")
            if content:
                yield content


def build_llm_client(settings: Settings, transport: LLMTransport | None = None) -> LLMClient:
    if settings.llm_provider == "fake":
        return FakeLLMClient()
    if settings.llm_provider in {"openai", "anthropic"}:
        selected_transport = transport or _httpx_stream_transport
        if settings.llm_provider == "openai":
            return OpenAICompatibleLLMClient(settings, selected_transport)
        return AnthropicLLMClient(settings, selected_transport)
    raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")


def parse_provider_json(raw_payload: str) -> dict:
    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError as exc:
        raise LLMProviderError("LLM provider returned malformed stream data") from exc
    if not isinstance(payload, dict):
        raise LLMProviderError("LLM provider returned malformed stream data")
    return payload


def provider_error_message(error_payload: object) -> str:
    if isinstance(error_payload, dict):
        message = error_payload.get("message") or error_payload.get("error")
        if message:
            return f"LLM provider error: {message}"
    return "LLM provider returned an error"
