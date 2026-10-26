# US-3.4: normalization shared by the evidence check and duplicate detection.
from app.normalization import duplicate_key, normalize_text


def test_normalize_text_ignores_case_and_repeated_whitespace() -> None:
    assert normalize_text("  Hola \n\t MUNDO  ") == "hola mundo"


def test_duplicate_key_treats_every_placeholder_as_the_same() -> None:
    assert duplicate_key("Soy [nombre], CBU: [dato oculto]") == duplicate_key("soy  [Dato Oculto], cbu: [número]")
    assert duplicate_key("Soy [nombre]") != duplicate_key("Soy Juan")
