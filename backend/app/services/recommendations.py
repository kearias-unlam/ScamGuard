"""US-7.1: recommendations chosen from a fixed catalog (docs/requirements.md, Recommendations). Never written by the
AI, so they never repeat data from the message. They run on the checked result, after the evidence check."""

from app.models import AnalysisResult, Recommendation, RecommendationType, RiskLevel

# User-visible texts, defined once in the backend. The dict order is the catalog order of the output.
RECOMMENDATION_TEXTS: dict[RecommendationType, str] = {
    "do_not_follow": "No respondas, no hagas clic y no sigas las instrucciones del mensaje.",
    "do_not_share_data": (
        "No compartas claves, códigos ni datos de tarjeta o de cuenta. Ningún banco ni empresa te los pide por mensaje."
    ),
    "do_not_pay": "No hagas pagos ni transferencias hasta confirmar el pedido por otro medio.",
    "verify_official_channel": (
        "Comunicate con la persona o la empresa por un canal que ya conozcas (su app, su sitio oficial o un número que "
        "tengas agendado), no por los datos que aparecen en el mensaje."
    ),
    "do_not_open_link": "No abras el link. Si necesitás entrar al sitio, escribí vos la dirección oficial.",
    "do_not_open_attachments": "No abras ni descargues los archivos adjuntos.",
    "take_your_time": "Tomate tu tiempo: la urgencia busca que actúes sin verificar.",
    "distrust_prizes": (
        "Desconfiá de premios o ganancias que no pediste, sobre todo si para recibirlos tenés que pagar o dar datos."
    ),
    "if_already_acted": (
        "Si ya compartiste datos o hiciste un pago, comunicate cuanto antes con tu banco y cambiá tus claves."
    ),
    "stay_alert": (
        "Aunque no se encontraron señales graves, desconfiá si más adelante te piden datos, códigos o dinero."
    ),
}

# Every level triggers at least one recommendation, so no result is left without one.
_RISK_LEVEL_RULES: dict[RiskLevel, frozenset[RecommendationType]] = {
    "HIGH": frozenset({"do_not_follow", "if_already_acted"}),
    "MEDIUM": frozenset({"verify_official_channel"}),
    "UNDETERMINED": frozenset({"verify_official_channel"}),
    "LOW": frozenset({"stay_alert"}),
}


def _triggered_types(result: AnalysisResult) -> set[RecommendationType]:
    return set(_RISK_LEVEL_RULES[result.risk_level])


def build_recommendations(result: AnalysisResult) -> list[Recommendation]:
    """Each triggered recommendation once, in catalog order."""
    triggered = _triggered_types(result)
    return [
        Recommendation(type=type_, text=text) for type_, text in RECOMMENDATION_TEXTS.items() if type_ in triggered
    ]
