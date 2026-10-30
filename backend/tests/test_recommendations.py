# US-7.1, US-7.2: recommendations by risk level and indicator type, from the fixed catalog.
import pytest

from app.ai.prompt import INDICATOR_TYPES
from app.models import AnalysisResult, Indicator, RiskLevel
from app.services.analysis import apply_evidence_check
from app.services.recommendations import _INDICATOR_RULES, RECOMMENDATION_TEXTS, build_recommendations


def _result(risk_level: RiskLevel, indicators: list[Indicator] | None = None) -> AnalysisResult:
    return AnalysisResult(risk_level=risk_level, summary="Resumen.", explanation="Explicación.", indicators=indicators or [])


@pytest.mark.parametrize(("risk_level", "expected"), [
    ("HIGH", ["do_not_follow", "if_already_acted"]),
    ("MEDIUM", ["verify_official_channel"]),
    ("UNDETERMINED", ["verify_official_channel"]),
    ("LOW", ["stay_alert"]),
])
def test_each_risk_level_gives_its_recommendations_in_catalog_order(risk_level: RiskLevel, expected: list[str]) -> None:
    recommendations = build_recommendations(_result(risk_level))

    assert [recommendation.type for recommendation in recommendations] == expected


@pytest.mark.parametrize("risk_level", ["HIGH", "MEDIUM", "UNDETERMINED", "LOW"])
def test_every_risk_level_gives_at_least_one_unique_recommendation_with_its_catalog_text(risk_level: RiskLevel) -> None:
    recommendations = build_recommendations(_result(risk_level))

    assert recommendations
    types = [recommendation.type for recommendation in recommendations]
    assert len(types) == len(set(types))
    assert all(recommendation.text == RECOMMENDATION_TEXTS[recommendation.type] for recommendation in recommendations)


def test_high_result_without_indicators_still_gets_the_high_recommendations() -> None:
    recommendations = build_recommendations(_result("HIGH", []))

    assert [recommendation.type for recommendation in recommendations] == ["do_not_follow", "if_already_acted"]


def test_catalog_covers_every_recommendation_type_once() -> None:
    assert list(RECOMMENDATION_TEXTS) == [
        "do_not_follow", "do_not_share_data", "do_not_pay", "verify_official_channel", "do_not_open_link",
        "do_not_open_attachments", "take_your_time", "distrust_prizes", "if_already_acted", "stay_alert",
    ]
    assert all(text.strip() for text in RECOMMENDATION_TEXTS.values())


# US-7.2: indicator rules, combined with the risk level rule; each recommendation once, in catalog order.
def _ind(type_: str, evidence: str = "x") -> Indicator:
    return Indicator(type=type_, title="Señal", description="Podría ser un engaño.", evidence=evidence)


def _types(result: AnalysisResult) -> list[str]:
    return [recommendation.type for recommendation in build_recommendations(result)]


def test_personal_data_request_adds_do_not_share_data() -> None:
    assert _types(_result("HIGH", [_ind("personal_data_request")])) == [
        "do_not_follow", "do_not_share_data", "if_already_acted",
    ]


def test_link_indicators_together_add_do_not_open_link_once() -> None:
    indicators = [_ind(type_) for type_ in ("suspicious_link", "lookalike_domain", "obfuscated_link", "deceptive_link")]

    assert _types(_result("HIGH", indicators)) == ["do_not_follow", "do_not_open_link", "if_already_acted"]


def test_impersonation_with_medium_adds_verify_official_channel_once() -> None:
    assert _types(_result("MEDIUM", [_ind("impersonation")])) == ["verify_official_channel"]


@pytest.mark.parametrize(("risk_level", "expected"), [
    ("LOW", ["stay_alert"]),
    ("HIGH", ["do_not_follow", "if_already_acted"]),
])
def test_writing_errors_adds_nothing(risk_level: RiskLevel, expected: list[str]) -> None:
    assert _types(_result(risk_level, [_ind("writing_errors")])) == expected


def test_unknown_indicator_type_adds_nothing() -> None:
    assert _types(_result("LOW", [_ind("unexpected_prize")])) == ["stay_alert"]


def test_mixed_indicators_follow_the_catalog_order() -> None:
    indicators = [_ind(type_) for type_ in ("unrealistic_promise", "urgency", "payment_request", "personal_data_request")]

    assert _types(_result("HIGH", indicators)) == [
        "do_not_follow", "do_not_share_data", "do_not_pay", "take_your_time", "distrust_prizes", "if_already_acted",
    ]


def test_indicator_dropped_by_the_evidence_check_adds_nothing() -> None:
    result = _result("HIGH", [_ind("urgency", "urgente"), _ind("personal_data_request", "tu clave")])

    checked = apply_evidence_check("Respondé urgente", result)

    assert _types(checked) == ["do_not_follow", "take_your_time", "if_already_acted"]


def test_all_indicators_dropped_gives_only_the_undetermined_recommendation() -> None:
    checked = apply_evidence_check("Hola", _result("HIGH", [_ind("personal_data_request", "tu clave")]))

    assert checked.risk_level == "UNDETERMINED"
    assert _types(checked) == ["verify_official_channel"]


def test_every_indicator_type_but_writing_errors_has_a_rule() -> None:
    # Drift guard: the rules are keyed by plain str, so a new indicator type in the AI contract must get one here.
    assert set(_INDICATOR_RULES) == set(INDICATOR_TYPES) - {"writing_errors"}
