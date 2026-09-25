import json

import pytest

from app.ai import analyzer
from app.ai.analyzer import analyze_with_model, parse_model_output
from app.ai.errors import AIServiceError
from app.ai.prompt import INSTRUCTIONS, OUTPUT_FORMAT

VALID = {
    "summary": "Pide transferir dinero.",
    "indicators": [{"type": "payment_request", "title": "Pedido de pago",
                    "description": "Solicita una transferencia.", "evidence": "Transferí hoy"}],
    "riskLevel": "HIGH",
    "explanation": "El pedido de pago sugiere un posible fraude.",
}


def _with(**changes: object) -> str:
    return json.dumps({**VALID, **changes})


def test_valid_output_is_parsed_with_prompt_and_schema(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[str, str, object]] = []

    def fake_generate_text(instructions: str, user_input: str, **kwargs: object) -> str:
        calls.append((instructions, user_input, kwargs.get("text_format")))
        return json.dumps(VALID)

    monkeypatch.setattr(analyzer, "generate_text", fake_generate_text)
    result = analyze_with_model("Transferí hoy")

    assert result.model_dump(by_alias=True) == VALID
    assert calls == [(INSTRUCTIONS, "Transferí hoy", OUTPUT_FORMAT)]


@pytest.mark.parametrize("text", [
    "esto no es JSON",
    '{"summary": "Pide',
    _with(riskLevel="UNDETERMINED"),
    _with(riskLevel="high"),
    _with(indicators=[{**VALID["indicators"][0], "type": "phishing"}]),
    _with(extra="x"),
    json.dumps({key: value for key, value in VALID.items() if key != "explanation"}),
])
def test_invalid_output_raises_ai_error(text: str) -> None:
    with pytest.raises(AIServiceError):
        parse_model_output(text)
