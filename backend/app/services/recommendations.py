"""US-7.1, US-7.2: recommendations chosen from a fixed catalog (docs/requirements.md, Recommendations) by risk level
and indicator type. Never written by the AI, so they never repeat data from the message. They run on the checked
result, after the evidence check, so a dropped indicator never adds one."""

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


# US-7.2: one recommendation per indicator type. Keyed by plain str like Indicator.type, so services do not depend on
# the AI layer; an unknown type adds nothing. writing_errors has none: a weak sign, covered by the risk level.
_INDICATOR_RULES: dict[str, RecommendationType] = {
    "personal_data_request": "do_not_share_data",
    "payment_request": "do_not_pay",
    "impersonation": "verify_official_channel",
    "sender_mismatch": "verify_official_channel",
    "failed_authentication": "verify_official_channel",
    "suspicious_link": "do_not_open_link",
    "lookalike_domain": "do_not_open_link",
    "obfuscated_link": "do_not_open_link",
    "deceptive_link": "do_not_open_link",
    "dangerous_attachment": "do_not_open_attachments",
    "urgency": "take_your_time",
    "unrealistic_promise": "distrust_prizes",
}


def _triggered_types(result: AnalysisResult) -> set[RecommendationType]:
    """Union of the risk level rule and the indicator rules; build_recommendations keeps each type once."""
    triggered = set(_RISK_LEVEL_RULES[result.risk_level])
    for indicator in result.indicators:
        if (type_ := _INDICATOR_RULES.get(indicator.type)) is not None:
            triggered.add(type_)
    return triggered


def build_recommendations(result: AnalysisResult) -> list[Recommendation]:
    """Each triggered recommendation once, in catalog order."""
    triggered = _triggered_types(result)
    return [
        Recommendation(type=type_, text=text) for type_, text in RECOMMENDATION_TEXTS.items() if type_ in triggered
    ]
