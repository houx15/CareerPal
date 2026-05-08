# LLM Provider Abstraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a provider-agnostic LLM layer with deterministic fake streaming for tests and clear production configuration validation.

**Architecture:** Keep the abstraction backend-only for this slice. `app.services.llm` owns internal message types, config parsing, provider selection, fake streaming, and OpenAI/Anthropic request translation; conversation SSE wiring remains for Slice 2.4.

**Tech Stack:** FastAPI backend, Pydantic settings, httpx-compatible async streaming interfaces, pytest.

---

## Scope Boundaries

This slice implements the tested adapter foundation from Milestone 2 Slice 2.3. It must not call real third-party services during tests and must not require real secrets in local/test environments.

No frontend UI changes are required for this slice. The design-bundle conversation surfaces were connected to persisted sessions in Slice 2.2; Slice 2.4 will connect those surfaces to streaming responses.

## Files

- Modify: `backend/app/core/config.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/llm.py`
- Create: `backend/tests/test_llm.py`
- Optionally modify: `backend/pyproject.toml` only if the current dependency set cannot support the implementation

## Task 1: LLM Settings Validation

**Files:**
- Modify: `backend/app/core/config.py`
- Test: `backend/tests/test_llm.py`

- [ ] **Step 1: Write failing config tests**

Add tests that instantiate `Settings` directly:

```python
import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_fake_llm_provider_is_valid_without_secrets():
    settings = Settings(environment="test", llm_provider="fake", llm_model_name="careerpal-fake")

    assert settings.llm_provider == "fake"
    assert settings.llm_model_name == "careerpal-fake"
    assert settings.llm_base_url is None
    assert settings.llm_api_key is None


def test_production_llm_config_requires_api_key_and_model_for_real_provider():
    with pytest.raises(ValidationError) as exc_info:
        Settings(environment="production", llm_provider="openai", secret_key="prod-secret")

    assert "llm_api_key must be configured" in str(exc_info.value)
    assert "llm_model_name must be configured" in str(exc_info.value)


def test_llm_provider_rejects_unknown_format():
    with pytest.raises(ValidationError) as exc_info:
        Settings(environment="test", llm_provider="bedrock", llm_model_name="x")

    assert "llm_provider must be one of" in str(exc_info.value)
```

- [ ] **Step 2: Run red test**

Run: `cd backend && python3 -m pytest tests/test_llm.py -q`

Expected: FAIL because `Settings` does not yet define `llm_provider`, `llm_model_name`, `llm_base_url`, or `llm_api_key`.

- [ ] **Step 3: Add minimal settings**

Add settings fields:

```python
llm_provider: str = "fake"
llm_base_url: str | None = None
llm_model_name: str | None = "careerpal-fake"
llm_api_key: str | None = None
```

Extend the existing `model_validator` so:

```python
allowed_providers = {"fake", "openai", "anthropic"}
if self.llm_provider not in allowed_providers:
    raise ValueError("llm_provider must be one of: anthropic, fake, openai")
if self.environment not in {"local", "test"} and self.llm_provider != "fake":
    missing = []
    if not self.llm_api_key:
        missing.append("llm_api_key must be configured")
    if not self.llm_model_name:
        missing.append("llm_model_name must be configured")
    if missing:
        raise ValueError("; ".join(missing))
```

- [ ] **Step 4: Run green test**

Run: `cd backend && python3 -m pytest tests/test_llm.py -q`

Expected: PASS for the new settings tests.

## Task 2: Internal LLM Types And Fake Streaming Provider

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/llm.py`
- Test: `backend/tests/test_llm.py`

- [ ] **Step 1: Write failing fake provider tests**

Append:

```python
import pytest

from app.services.llm import LLMMessage, build_llm_client


@pytest.mark.anyio
async def test_fake_provider_streams_deterministic_response_chunks():
    client = build_llm_client(Settings(environment="test", llm_provider="fake", llm_model_name="careerpal-fake"))

    chunks = [
        chunk
        async for chunk in client.stream_chat(
            [
                LLMMessage(role="system", content="You are CareerPal."),
                LLMMessage(role="user", content="I built a course scheduler."),
            ]
        )
    ]

    assert "".join(chunks) == "I noted that. Tell me one concrete impact or result from that experience."
```

- [ ] **Step 2: Run red test**

Run: `cd backend && python3 -m pytest tests/test_llm.py::test_fake_provider_streams_deterministic_response_chunks -q`

Expected: FAIL because `app.services.llm` does not exist.

- [ ] **Step 3: Implement minimal fake provider**

Create:

```python
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass
from typing import Literal, Protocol

from app.core.config import Settings

LLMRole = Literal["system", "user", "assistant"]


@dataclass(frozen=True)
class LLMMessage:
    role: LLMRole
    content: str


class LLMClient(Protocol):
    async def stream_chat(self, messages: Sequence[LLMMessage]) -> AsyncIterator[str]:
        ...


class FakeLLMClient:
    async def stream_chat(self, messages: Sequence[LLMMessage]) -> AsyncIterator[str]:
        for chunk in [
            "I noted that. ",
            "Tell me one concrete impact or result ",
            "from that experience.",
        ]:
            yield chunk


def build_llm_client(settings: Settings) -> LLMClient:
    if settings.llm_provider == "fake":
        return FakeLLMClient()
    raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")
```

- [ ] **Step 4: Run green test**

Run: `cd backend && python3 -m pytest tests/test_llm.py -q`

Expected: PASS for settings and fake provider tests.

## Task 3: OpenAI-Compatible Adapter Request Shape

**Files:**
- Modify: `backend/app/services/llm.py`
- Test: `backend/tests/test_llm.py`

- [ ] **Step 1: Write failing OpenAI adapter test**

Append:

```python
@pytest.mark.anyio
async def test_openai_adapter_posts_streaming_chat_completion_shape():
    recorded = {}

    async def transport(payload):
        recorded.update(payload)
        return ['data: {"choices":[{"delta":{"content":"Hello"}}]}', "data: [DONE]"]

    client = build_llm_client(
        Settings(
            environment="production",
            secret_key="prod-secret",
            llm_provider="openai",
            llm_base_url="https://llm.example/v1",
            llm_model_name="career-model",
            llm_api_key="test-key",
        ),
        transport=transport,
    )

    chunks = [chunk async for chunk in client.stream_chat([LLMMessage(role="user", content="Hi")])]

    assert chunks == ["Hello"]
    assert recorded["url"] == "https://llm.example/v1/chat/completions"
    assert recorded["headers"]["Authorization"] == "Bearer test-key"
    assert recorded["json"] == {
        "model": "career-model",
        "messages": [{"role": "user", "content": "Hi"}],
        "stream": True,
    }
```

- [ ] **Step 2: Run red test**

Run: `cd backend && python3 -m pytest tests/test_llm.py::test_openai_adapter_posts_streaming_chat_completion_shape -q`

Expected: FAIL because `build_llm_client` does not support `transport` or `openai`.

- [ ] **Step 3: Implement OpenAI-compatible adapter**

Add:

```python
import json
from collections.abc import Awaitable, Callable

LLMTransport = Callable[[dict], Awaitable[Sequence[str]]]


class OpenAICompatibleLLMClient:
    def __init__(self, settings: Settings, transport: LLMTransport):
        self._settings = settings
        self._transport = transport

    async def stream_chat(self, messages: Sequence[LLMMessage]) -> AsyncIterator[str]:
        lines = await self._transport(
            {
                "url": f"{self._settings.llm_base_url.rstrip('/')}/chat/completions",
                "headers": {"Authorization": f"Bearer {self._settings.llm_api_key}"},
                "json": {
                    "model": self._settings.llm_model_name,
                    "messages": [{"role": message.role, "content": message.content} for message in messages],
                    "stream": True,
                },
            }
        )
        for line in lines:
            if line == "data: [DONE]":
                break
            if not line.startswith("data: "):
                continue
            payload = json.loads(line.removeprefix("data: "))
            content = payload.get("choices", [{}])[0].get("delta", {}).get("content")
            if content:
                yield content
```

Update `build_llm_client(settings, transport=None)` to return `OpenAICompatibleLLMClient` for `openai`, requiring a transport in tests and using a real httpx transport only if implemented in Task 5.

- [ ] **Step 4: Run green test**

Run: `cd backend && python3 -m pytest tests/test_llm.py -q`

Expected: PASS.

## Task 4: Anthropic Adapter Request Shape

**Files:**
- Modify: `backend/app/services/llm.py`
- Test: `backend/tests/test_llm.py`

- [ ] **Step 1: Write failing Anthropic adapter test**

Append:

```python
@pytest.mark.anyio
async def test_anthropic_adapter_posts_streaming_messages_shape():
    recorded = {}

    async def transport(payload):
        recorded.update(payload)
        return ['event: content_block_delta', 'data: {"delta":{"text":"Hi there"}}', "event: message_stop"]

    client = build_llm_client(
        Settings(
            environment="production",
            secret_key="prod-secret",
            llm_provider="anthropic",
            llm_base_url="https://anthropic.example/v1",
            llm_model_name="claude-career",
            llm_api_key="test-key",
        ),
        transport=transport,
    )

    chunks = [
        chunk
        async for chunk in client.stream_chat(
            [
                LLMMessage(role="system", content="You are CareerPal."),
                LLMMessage(role="user", content="Hi"),
            ]
        )
    ]

    assert chunks == ["Hi there"]
    assert recorded["url"] == "https://anthropic.example/v1/messages"
    assert recorded["headers"]["x-api-key"] == "test-key"
    assert recorded["json"] == {
        "model": "claude-career",
        "system": "You are CareerPal.",
        "messages": [{"role": "user", "content": "Hi"}],
        "stream": True,
        "max_tokens": 1024,
    }
```

- [ ] **Step 2: Run red test**

Run: `cd backend && python3 -m pytest tests/test_llm.py::test_anthropic_adapter_posts_streaming_messages_shape -q`

Expected: FAIL because `anthropic` is not implemented.

- [ ] **Step 3: Implement Anthropic adapter**

Add:

```python
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
        lines = await self._transport(
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
        )
        for line in lines:
            if line == "event: message_stop":
                break
            if not line.startswith("data: "):
                continue
            payload = json.loads(line.removeprefix("data: "))
            content = payload.get("delta", {}).get("text")
            if content:
                yield content
```

Update `build_llm_client` to return `AnthropicLLMClient`.

- [ ] **Step 4: Run green test**

Run: `cd backend && python3 -m pytest tests/test_llm.py -q`

Expected: PASS.

## Task 5: Real HTTP Streaming Transport

**Files:**
- Modify: `backend/app/services/llm.py`
- Test: `backend/tests/test_llm.py`

- [ ] **Step 1: Write failing transport default test**

Append:

```python
def test_real_provider_requires_base_url_before_building_client():
    with pytest.raises(ValueError) as exc_info:
        build_llm_client(
            Settings(
                environment="production",
                secret_key="prod-secret",
                llm_provider="openai",
                llm_model_name="career-model",
                llm_api_key="test-key",
            )
        )

    assert "llm_base_url must be configured" in str(exc_info.value)
```

- [ ] **Step 2: Run red test**

Run: `cd backend && python3 -m pytest tests/test_llm.py::test_real_provider_requires_base_url_before_building_client -q`

Expected: FAIL because the builder does not yet validate `llm_base_url` consistently.

- [ ] **Step 3: Implement builder validation and default httpx transport**

Add a private async transport that uses `httpx.AsyncClient.stream("POST", ...)` and yields SSE lines from `response.aiter_lines()`. Use it only when `transport` is not injected.

Builder behavior:

```python
if settings.llm_provider in {"openai", "anthropic"}:
    if not settings.llm_base_url:
        raise ValueError("llm_base_url must be configured")
    selected_transport = transport or httpx_stream_transport
```

Do not add tests that call the network.

- [ ] **Step 4: Run green test**

Run: `cd backend && python3 -m pytest tests/test_llm.py -q`

Expected: PASS.

## Task 6: Verification And Review

**Files:**
- Review all changed files

- [ ] **Step 1: Run full backend tests**

Run: `cd backend && python3 -m pytest`

Expected: all backend tests pass.

- [ ] **Step 2: Run full frontend tests/typecheck/build to catch contract drift**

Run:

```bash
cd frontend && npm test -- --run
cd frontend && npx tsc --noEmit
cd frontend && npm run build
```

Expected: all pass.

- [ ] **Step 3: Run diff hygiene**

Run:

```bash
git diff --check
rm -f frontend/tsconfig.tsbuildinfo
git status -sb
```

Expected: no whitespace errors and only intended files are changed.

- [ ] **Step 4: Commit and push**

Run:

```bash
git add backend/app/core/config.py backend/app/services/__init__.py backend/app/services/llm.py backend/tests/test_llm.py docs/superpowers/plans/2026-05-08-llm-provider-abstraction.md
git commit -m "feat: add LLM provider abstraction"
git push
```

Expected: branch pushes to `origin/main`.

## Self-Review Checklist

- [ ] Spec coverage: Slice 2.3 adapter, config validation, fake provider, OpenAI-compatible format, Anthropic format.
- [ ] No real secrets are introduced.
- [ ] Tests do not call third-party APIs.
- [ ] No UI behavior changes outside this slice.
- [ ] The output enables Slice 2.4 SSE without implementing SSE prematurely.
