# US-7.1: recommendations by risk level, from the fixed catalog.
import pytest

from app.models import AnalysisResult, Indicator, RiskLevel
from app.services.recommendations import RECOMMENDATION_TEXTS, build_recommendations


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
