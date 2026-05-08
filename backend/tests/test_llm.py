import anyio
import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.services.llm import LLMMessage, LLMProviderError, build_llm_client


def production_llm_settings(**overrides):
    values = {
        "environment": "production",
        "secret_key": "prod-secret",
        "resume_storage_provider": "oss",
        "oss_endpoint": "https://oss-cn-hangzhou.aliyuncs.com",
        "oss_bucket": "careerpal-bucket",
        "oss_access_key_id": "test-access-key",
        "oss_access_key_secret": "test-secret",
    }
    values.update(overrides)
    return Settings(**values)


def test_fake_llm_provider_is_valid_without_secrets():
    settings = Settings(environment="test", llm_provider="fake", llm_model_name="careerpal-fake")

    assert settings.llm_provider == "fake"
    assert settings.llm_model_name == "careerpal-fake"
    assert settings.llm_base_url is None
    assert settings.llm_api_key is None


def test_production_llm_config_requires_api_key_and_model_for_real_provider():
    with pytest.raises(ValidationError) as exc_info:
        production_llm_settings(llm_provider="openai")

    assert "llm_api_key must be configured" in str(exc_info.value)
    assert "llm_model_name must be configured" in str(exc_info.value)
    assert "llm_base_url must be configured" in str(exc_info.value)


def test_llm_provider_rejects_unknown_format():
    with pytest.raises(ValidationError) as exc_info:
        Settings(environment="test", llm_provider="bedrock", llm_model_name="x")

    assert "llm_provider must be one of" in str(exc_info.value)


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


@pytest.mark.anyio
async def test_openai_adapter_posts_streaming_chat_completion_shape():
    recorded = {}

    async def transport(payload):
        recorded.update(payload)
        yield 'data: {"choices":[{"delta":{"content":"Hello"}}]}'
        yield "data: [DONE]"

    client = build_llm_client(
        production_llm_settings(
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


@pytest.mark.anyio
async def test_anthropic_adapter_posts_streaming_messages_shape():
    recorded = {}

    async def transport(payload):
        recorded.update(payload)
        yield "event: content_block_delta"
        yield 'data: {"delta":{"text":"Hi there"}}'
        yield "event: message_stop"

    client = build_llm_client(
        production_llm_settings(
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


def test_real_provider_requires_explicit_config_in_local_environment():
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            environment="local",
            llm_provider="openai",
            llm_base_url="https://llm.example/v1",
        )

    assert "llm_api_key must be configured" in str(exc_info.value)
    assert "llm_model_name must be configured" in str(exc_info.value)


@pytest.mark.anyio
async def test_openai_adapter_yields_first_chunk_before_transport_finishes():
    gate = anyio.Event()
    events = []

    async def transport(payload):
        events.append("before-first")
        yield 'data: {"choices":[{"delta":{"content":"Hello"}}]}'
        await gate.wait()
        yield 'data: {"choices":[{"delta":{"content":" later"}}]}'
        yield "data: [DONE]"

    client = build_llm_client(
        production_llm_settings(
            llm_provider="openai",
            llm_base_url="https://llm.example/v1",
            llm_model_name="career-model",
            llm_api_key="test-key",
        ),
        transport=transport,
    )

    stream = client.stream_chat([LLMMessage(role="user", content="Hi")])
    first = await anext(stream)

    assert first == "Hello"
    assert events == ["before-first"]

    gate.set()
    rest = [chunk async for chunk in stream]
    assert rest == [" later"]


@pytest.mark.anyio
async def test_openai_adapter_raises_provider_error_from_stream_event():
    async def transport(payload):
        yield 'data: {"error":{"message":"rate limited"}}'

    client = build_llm_client(
        production_llm_settings(
            llm_provider="openai",
            llm_base_url="https://llm.example/v1",
            llm_model_name="career-model",
            llm_api_key="test-key",
        ),
        transport=transport,
    )

    with pytest.raises(LLMProviderError) as exc_info:
        [chunk async for chunk in client.stream_chat([LLMMessage(role="user", content="Hi")])]

    assert "rate limited" in str(exc_info.value)


@pytest.mark.anyio
async def test_openai_adapter_ignores_empty_choice_stream_chunks():
    async def transport(payload):
        yield 'data: {"choices":[]}'
        yield 'data: {"choices":[{"delta":{"content":"Hello"}}]}'
        yield "data: [DONE]"

    client = build_llm_client(
        production_llm_settings(
            llm_provider="openai",
            llm_base_url="https://llm.example/v1",
            llm_model_name="career-model",
            llm_api_key="test-key",
        ),
        transport=transport,
    )

    chunks = [chunk async for chunk in client.stream_chat([LLMMessage(role="user", content="Hi")])]

    assert chunks == ["Hello"]


@pytest.mark.anyio
async def test_anthropic_adapter_raises_provider_error_from_stream_event():
    async def transport(payload):
        yield "event: error"
        yield 'data: {"error":{"message":"overloaded"}}'

    client = build_llm_client(
        production_llm_settings(
            llm_provider="anthropic",
            llm_base_url="https://anthropic.example/v1",
            llm_model_name="claude-career",
            llm_api_key="test-key",
        ),
        transport=transport,
    )

    with pytest.raises(LLMProviderError) as exc_info:
        [chunk async for chunk in client.stream_chat([LLMMessage(role="user", content="Hi")])]

    assert "overloaded" in str(exc_info.value)
