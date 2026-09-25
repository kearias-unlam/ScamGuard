import httpx
import pytest
from openai import APIConnectionError, APIStatusError, APITimeoutError, OpenAI
from openai.types.responses import Response

from app.ai.client import MAX_RETRIES, TIMEOUT_SECONDS, build_client, generate_text
from app.ai.config import load_settings
from app.ai.errors import AIServiceError

REQUEST = httpx.Request("POST", "https://example.invalid/openai/v1/responses")


@pytest.fixture(autouse=True)
def azure_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AZURE_OPENAI_ENDPOINT", "https://example.invalid/openai/v1/")
    monkeypatch.setenv("AZURE_OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AZURE_OPENAI_DEPLOYMENT", "test-deployment")


def _response_with_text(text: str) -> Response:
    return Response.model_validate({
        "id": "resp_1", "object": "response", "created_at": 0, "model": "test-deployment",
        "parallel_tool_calls": True, "tool_choice": "auto", "tools": [],
        "output": [{
            "id": "msg_1", "type": "message", "role": "assistant", "status": "completed",
            "content": [{"type": "output_text", "text": text, "annotations": []}],
        }],
    })


def _client_raising(monkeypatch: pytest.MonkeyPatch, error: Exception) -> OpenAI:
    client = build_client(load_settings())

    def fake_create(**_: object) -> Response:
        raise error

    monkeypatch.setattr(client.responses, "create", fake_create)
    return client


def test_returns_output_text_on_success(monkeypatch: pytest.MonkeyPatch) -> None:
    client = build_client(load_settings())
    captured: dict[str, object] = {}

    def fake_create(**kwargs: object) -> Response:
        captured.update(kwargs)
        return _response_with_text('{"ok": true}')

    monkeypatch.setattr(client.responses, "create", fake_create)

    assert generate_text("prompt", "hola", client=client) == '{"ok": true}'
    assert captured == {"model": "test-deployment", "instructions": "prompt", "input": "hola"}


def test_client_uses_60_second_timeout_without_retries() -> None:
    client = build_client(load_settings())
    assert client.timeout == TIMEOUT_SECONDS == 60.0
    assert client.max_retries == MAX_RETRIES == 0
    assert str(client.base_url) == "https://example.invalid/openai/v1/"


def test_timeout_becomes_ai_error(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _client_raising(monkeypatch, APITimeoutError(request=REQUEST))
    with pytest.raises(AIServiceError):
        generate_text("prompt", "hola", client=client)


@pytest.mark.parametrize("error", [
    APIConnectionError(request=REQUEST),
    APIStatusError("server error", response=httpx.Response(500, request=REQUEST), body=None),
])
def test_sdk_exception_becomes_ai_error(monkeypatch: pytest.MonkeyPatch, error: Exception) -> None:
    client = _client_raising(monkeypatch, error)
    with pytest.raises(AIServiceError):
        generate_text("prompt", "hola", client=client)


def test_empty_output_becomes_ai_error(monkeypatch: pytest.MonkeyPatch) -> None:
    client = build_client(load_settings())
    monkeypatch.setattr(client.responses, "create", lambda **_: _response_with_text("  "))
    with pytest.raises(AIServiceError):
        generate_text("prompt", "hola", client=client)


def test_missing_config_becomes_ai_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AZURE_OPENAI_API_KEY")
    with pytest.raises(AIServiceError, match="AZURE_OPENAI_API_KEY"):
        generate_text("prompt", "hola")
