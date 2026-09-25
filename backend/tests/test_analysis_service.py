import pytest

from app.models import AnalysisResult, Indicator, RiskLevel
from app.services.analysis import analyze_message

MODEL_EXPLANATION = "Explicación del modelo."


def _indicator(evidence: str, type_: str = "urgency") -> Indicator:
    return Indicator(type=type_, title="Título", description="Descripción.", evidence=evidence)


def _analyze(message: str, indicators: list[Indicator], risk: RiskLevel = "HIGH") -> AnalysisResult:
    model_result = AnalysisResult(risk_level=risk, summary="Resumen.", explanation=MODEL_EXPLANATION, indicators=indicators)
    return analyze_message(message, lambda _: model_result)


def test_keeps_quoted_evidence_and_model_values() -> None:
    result = _analyze("Pagá hoy mismo", [_indicator("hoy mismo")])
    assert [i.evidence for i in result.indicators] == ["hoy mismo"]
    assert (result.risk_level, result.explanation, result.summary) == ("HIGH", MODEL_EXPLANATION, "Resumen.")


def test_match_ignores_case_and_repeated_whitespace() -> None:
    result = _analyze("Pagá  HOY\n mismo", [_indicator("hoy mismo"), _indicator("PAGÁ   hoy")])
    assert [i.evidence for i in result.indicators] == ["hoy mismo", "PAGÁ   hoy"]  # kept verbatim


@pytest.mark.parametrize("evidence", ["", "  \n\t "])
def test_empty_evidence_is_dropped(evidence: str) -> None:
    result = _analyze("Pagá hoy mismo", [_indicator("hoy mismo"), _indicator(evidence, "payment_request")])
    assert [i.evidence for i in result.indicators] == ["hoy mismo"]
    assert result.risk_level == "HIGH"


def test_unquoted_evidence_is_dropped_and_risk_kept() -> None:
    result = _analyze("Pagá hoy mismo", [_indicator("hoy mismo"), _indicator("transferí ya")])
    assert [i.evidence for i in result.indicators] == ["hoy mismo"]
    assert (result.risk_level, result.explanation) == ("HIGH", MODEL_EXPLANATION)


def test_all_indicators_dropped_sets_undetermined() -> None:
    result = _analyze("Hola, ¿cómo estás?", [_indicator("transferí ya"), _indicator("")])
    assert result.risk_level == "UNDETERMINED"
    assert result.explanation == "No se encontraron citas del mensaje que respalden los indicadores."
    assert result.indicators == []
    assert result.summary == "Resumen."


def test_no_indicators_from_model_keeps_risk_and_explanation() -> None:
    result = _analyze("Hola", [], risk="LOW")
    assert (result.risk_level, result.explanation, result.indicators) == ("LOW", MODEL_EXPLANATION, [])
