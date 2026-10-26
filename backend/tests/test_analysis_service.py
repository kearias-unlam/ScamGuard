import pytest

from app.ai.analyzer import AnalyzedMessage
from app.models import AnalysisResult, Indicator, RiskLevel
from app.services.analysis import analyze_message
from app.storage.critical_messages import StorageError

MODEL_EXPLANATION = "Explicación del modelo."


def _indicator(evidence: str, type_: str = "urgency") -> Indicator:
    return Indicator(type=type_, title="Título", description="Descripción.", evidence=evidence)


def _analyze(message: str, indicators: list[Indicator], risk: RiskLevel = "HIGH") -> AnalysisResult:
    model_result = AnalysisResult(risk_level=risk, summary="Resumen.", explanation=MODEL_EXPLANATION, indicators=indicators)
    return analyze_message(message, lambda _: AnalyzedMessage(result=model_result, topic="other", masked_message=""))


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


# US-3.3: save shared critical messages.
SharedSave = tuple[str, str]


def _share(
    message: str,
    indicators: list[Indicator],
    risk: RiskLevel = "HIGH",
    *,
    share: bool = True,
    masked: str = "Hola, soy [nombre], pasame plata al 1123456789",
    sensitive_data: str = "",
) -> tuple[AnalysisResult, list[SharedSave]]:
    saved: list[SharedSave] = []
    model_result = AnalysisResult(risk_level=risk, summary="Resumen.", explanation=MODEL_EXPLANATION, indicators=indicators)
    result = analyze_message(
        message,
        lambda _: AnalyzedMessage(result=model_result, topic="family_money_request", masked_message=masked),
        share_in_panel=share,
        sensitive_data=sensitive_data,
        save=lambda topic, text: saved.append((topic, text)),
    )
    return result, saved


def test_shared_high_message_is_saved_masked_with_its_topic() -> None:
    _, saved = _share("Pasame plata hoy mismo", [_indicator("hoy mismo")], sensitive_data="plata")
    assert saved == [("family_money_request", "Hola, soy [nombre], pasame [dato oculto] al [número]")]


def test_not_shared_high_message_is_not_saved() -> None:
    _, saved = _share("Pasame plata hoy mismo", [_indicator("hoy mismo")], share=False)
    assert saved == []


@pytest.mark.parametrize("risk", ["LOW", "MEDIUM"])
def test_shared_low_and_medium_messages_are_not_saved(risk: RiskLevel) -> None:
    _, saved = _share("Pasame plata hoy mismo", [_indicator("hoy mismo")], risk=risk)
    assert saved == []


def test_shared_message_that_becomes_undetermined_is_not_saved() -> None:
    # The model says HIGH, but no evidence is quoted from the message: the final risk is UNDETERMINED.
    result, saved = _share("Hola, ¿cómo estás?", [_indicator("transferí ya")])
    assert result.risk_level == "UNDETERMINED"
    assert saved == []


@pytest.mark.parametrize("masked", ["", "  \n\t "])
def test_blank_masked_message_is_not_saved(masked: str) -> None:
    _, saved = _share("Pasame plata hoy mismo", [_indicator("hoy mismo")], masked=masked)
    assert saved == []


def test_storage_error_keeps_the_result() -> None:
    def failing_save(topic: str, text: str) -> None:
        raise StorageError("disk full")

    model_result = AnalysisResult(
        risk_level="HIGH", summary="Resumen.", explanation=MODEL_EXPLANATION, indicators=[_indicator("hoy mismo")],
    )
    result = analyze_message(
        "Pasame plata hoy mismo",
        lambda _: AnalyzedMessage(result=model_result, topic="other", masked_message="Pasame plata hoy mismo"),
        share_in_panel=True,
        save=failing_save,
    )
    assert result == model_result
