"""Text normalization shared by the evidence check (services/analysis.py) and duplicate detection (storage/)."""


def normalize_text(text: str) -> str:
    """Case-insensitive form with runs of whitespace collapsed to one space and edges trimmed."""
    return " ".join(text.split()).casefold()
