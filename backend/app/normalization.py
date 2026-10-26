"""Text normalization shared by the evidence check (services/analysis.py), the masking (services/masking.py),
and duplicate detection (storage/)."""

import re

# Any placeholder written by the model or the masking ([nombre], [dato oculto], [número], [enlace], ...).
PLACEHOLDER_PATTERN = r"\[[^\[\]]*\]"
_PLACEHOLDER = re.compile(PLACEHOLDER_PATTERN)
_ANY_PLACEHOLDER = "[oculto]"


def normalize_text(text: str) -> str:
    """Case-insensitive form with runs of whitespace collapsed to one space and edges trimmed."""
    return " ".join(text.split()).casefold()


def duplicate_key(text: str) -> str:
    """normalize_text with every placeholder replaced by the same token: the model does not always hide
    the same datum with the same placeholder, so texts that differ only there are the same message."""
    return _PLACEHOLDER.sub(_ANY_PLACEHOLDER, normalize_text(text))
