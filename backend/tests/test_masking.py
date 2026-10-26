# US-3.3: deterministic masking applied before saving a shared critical message.
import pytest

from app.services.masking import mask_personal_data


@pytest.mark.parametrize(("sensitive_data", "expected"), [
    ("Juan", "Hola, soy [dato oculto], tu hijo."),
    ("  juan  ", "Hola, soy [dato oculto], tu hijo."),  # Trimmed and case-insensitive.
    ("Juan, ,", "Hola, soy [dato oculto], tu hijo."),  # Empty terms are ignored.
    ("", "Hola, soy Juan, tu hijo."),
])
def test_user_terms_are_hidden(sensitive_data: str, expected: str) -> None:
    assert mask_personal_data("Hola, soy Juan, tu hijo.", sensitive_data) == expected


def test_longer_user_term_wins_and_placeholders_are_not_rematched() -> None:
    masked = mask_personal_data("Soy Juan Pérez, de Juan Pérez SA.", "Juan, Juan Pérez, dato")
    assert masked == "Soy [dato oculto], de [dato oculto] SA."


def test_user_terms_never_alter_existing_placeholders() -> None:
    # [nombre] comes from the model's maskedMessage; [email] from the email step.
    masked = mask_personal_data("Soy [nombre], escribime a juan@mail.com", "nombre, email, Juan")
    assert masked == "Soy [nombre], escribime a [email]"


@pytest.mark.parametrize(("text", "expected"), [
    ("Entrá a https://banco-seguro.com/login ya", "Entrá a [enlace] ya"),
    ("Ingresá en www.banco.com.", "Ingresá en [enlace]."),
    ("Mirá bit.ly/abc123 ahora", "Mirá [enlace] ahora"),
])
def test_links_are_hidden(text: str, expected: str) -> None:
    assert mask_personal_data(text, "") == expected


def test_emails_are_hidden() -> None:
    assert mask_personal_data("Escribí a juan.perez+ok@mail.com.ar.", "") == "Escribí a [email]."


@pytest.mark.parametrize(("text", "expected"), [
    ("Llamá al +54 9 11 1234-5678", "Llamá al [número]"),
    ("Mi número es 11-1234-5678.", "Mi número es [número]."),
    ("CBU 0170099220000067797370", "CBU [número]"),
    ("Tarjeta 4111 1111 1111 1111", "Tarjeta [número]"),
    ("DNI 12.345.678", "DNI [número]"),
])
def test_long_numbers_are_hidden(text: str, expected: str) -> None:
    assert mask_personal_data(text, "") == expected


@pytest.mark.parametrize("text", [
    "Necesito 10000 pesos urgente",
    "Ganaste $1.000.000 en el sorteo",
    "Transferime 1500000 pesos hoy",
    "Son USD 2500000 de ganancia",
    "Hola, ¿cómo estás?",
])
def test_money_and_plain_text_stay_unchanged(text: str) -> None:
    assert mask_personal_data(text, "") == text


def test_all_steps_combined() -> None:
    masked = mask_personal_data(
        "Soy Juan, pasame $50.000 al CBU 0170099220000067797370 o escribime a juan@mail.com: bit.ly/x",
        "Juan",
    )
    assert masked == "Soy [dato oculto], pasame $50.000 al CBU [número] o escribime a [email]: [enlace]"
