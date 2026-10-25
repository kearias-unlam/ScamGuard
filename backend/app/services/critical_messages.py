"""Business logic for the critical messages panel: give each stored topic group its Spanish title."""

from app.models import CriticalMessagesResponse, CriticalTopic, Topic
from app.storage.critical_messages import list_critical_topics

# User-visible titles (docs/requirements.md, AI contract topic list). Defined once in the backend.
TOPIC_TITLES: dict[Topic, str] = {
    "family_money_request": "Pedido de dinero de un familiar o conocido",
    "bank_impersonation": "Suplantación de bancos o billeteras virtuales",
    "credentials_request": "Pedido de claves, códigos o datos de cuenta",
    "prize_or_giveaway": "Premios, sorteos y regalos",
    "package_delivery": "Envíos y paquetes retenidos",
    "investment_offer": "Inversiones y ganancias fáciles",
    "job_offer": "Ofertas de trabajo",
    "other": "Otros engaños",
}


def get_critical_messages() -> CriticalMessagesResponse:
    """Stored groups keep their order (most messages first); raises StorageError if the DB cannot be read."""
    return CriticalMessagesResponse(topics=[
        CriticalTopic(topic=stored.topic, title=TOPIC_TITLES[stored.topic], messages=stored.messages)
        for stored in list_critical_topics()
    ])
