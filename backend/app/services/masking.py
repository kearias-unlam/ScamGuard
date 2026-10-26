"""Deterministic masking of shared critical messages: steps 2 to 5 of docs/requirements.md, Critical messages storage.
Runs on top of the model's maskedMessage (step 1), which is best effort."""

import re

USER_TERM_PLACEHOLDER = "[dato oculto]"
LINK_PLACEHOLDER = "[enlace]"
EMAIL_PLACEHOLDER = "[email]"
NUMBER_PLACEHOLDER = "[número]"

# Trailing punctuation stays outside the match so "ingresá a bit.ly/abc." keeps its final period.
_LINK_END = r"[^\s.,;:!?)\]]"
_LINK = re.compile(
    rf"(?:https?://|www\.)\S*{_LINK_END}"
    rf"|\b[\w-]+(?:\.[\w-]+)*\.[a-z]{{2,}}/(?:\S*{_LINK_END})?",
    re.IGNORECASE,
)
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
# Any placeholder already in the text ([nombre] from the model, [enlace], [email], ...).
_PLACEHOLDER = r"\[[^\[\]]*\]"
# 7 or more digits, optionally starting with + and with one space, dot, or dash between digits.
_NUMBER = re.compile(r"\+?\d(?:[ .-]?\d){6,}")
# Amounts of money are kept: currency symbol or code before the number, or currency word after it.
_CURRENCY_BEFORE = re.compile(r"(?:\$|\b(?:usd|ars|u\$s))\s*$", re.IGNORECASE)
_CURRENCY_AFTER = re.compile(r"\s*(?:pesos|d[oó]lares|usd|ars)\b", re.IGNORECASE)


def _mask_user_terms(text: str, sensitive_data: str) -> str:
    """Replace each comma-separated term (trimmed, non-empty) case-insensitively. Single pass with existing
    placeholders matched first and kept, so a term never alters a placeholder. Longer terms win."""
    terms = sorted({term.strip() for term in sensitive_data.split(",") if term.strip()}, key=len, reverse=True)
    if not terms:
        return text
    pattern = re.compile(f"({_PLACEHOLDER})|" + "|".join(re.escape(term) for term in terms), re.IGNORECASE)
    return pattern.sub(lambda match: match.group(1) or USER_TERM_PLACEHOLDER, text)


def _mask_number(match: re.Match[str]) -> str:
    before = match.string[:match.start()]
    after = match.string[match.end():]
    if _CURRENCY_BEFORE.search(before) or _CURRENCY_AFTER.match(after):
        return match.group(0)
    return NUMBER_PLACEHOLDER


def mask_personal_data(text: str, sensitive_data: str) -> str:
    """Links and emails first (a user term inside them would break their detection), then user terms,
    then long numbers. Placeholders contain no digits, dots, or @, so later steps never alter them."""
    masked = _LINK.sub(LINK_PLACEHOLDER, text)
    masked = _EMAIL.sub(EMAIL_PLACEHOLDER, masked)
    masked = _mask_user_terms(masked, sensitive_data)
    return _NUMBER.sub(_mask_number, masked)
