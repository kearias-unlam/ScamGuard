# US-3.4: normalization shared by the evidence check and duplicate detection.
from app.normalization import normalize_text


def test_normalize_text_ignores_case_and_repeated_whitespace() -> None:
    assert normalize_text("  Hola \n\t MUNDO  ") == "hola mundo"
