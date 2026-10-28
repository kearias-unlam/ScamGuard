"""Email digest (US-4.3): turn a raw .eml file into one text for the analyzer and the evidence check.
Format and rules: docs/requirements.md, Email digest. Standard library only; the email is never stored."""

import email
import email.errors
import re
from email.message import EmailMessage
from email.policy import default
from html.parser import HTMLParser

MAX_BODY_CHARS = 20_000
MAX_LINKS = 20

_HEADER_LINES = (
    ("From", "De"),
    ("Reply-To", "Responder a"),
    ("Return-Path", "Dirección de retorno"),
    ("Subject", "Asunto"),
)
_AUTH_METHODS = ("spf", "dkim", "dmarc")
_AUTH_RESULT = re.compile(r"\b(spf|dkim|dmarc)\s*=\s*([a-z]+)", re.IGNORECASE)
_BLOCK_TAGS = {"p", "br", "div", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6"}
_HIDDEN_TAGS = {"script", "style"}


class InvalidEmailError(Exception):
    """The email has no readable text body. Never carries email content."""


def _one_line(value: str) -> str:
    """Collapse whitespace, including decoded or folded newlines, so a header can never add a digest line."""
    return " ".join(value.split())


def _header(message: EmailMessage, name: str) -> str:
    """Decoded header value on one line, or "" when missing or unparseable (its digest line is then omitted)."""
    try:
        value = message[name]
        return _one_line(str(value)) if value is not None else ""
    except (ValueError, IndexError, TypeError, email.errors.HeaderParseError):
        return ""


def _authentication(message: EmailMessage) -> str:
    """spf, dkim, and dmarc results from the topmost Authentication-Results header, in that order and lowercase."""
    try:
        headers = message.get_all("Authentication-Results") or []
        topmost = str(headers[0]) if headers else ""
    except (ValueError, IndexError, TypeError, email.errors.HeaderParseError):
        return ""
    results: dict[str, str] = {}
    for method, result in _AUTH_RESULT.findall(topmost):
        results.setdefault(method.lower(), result.lower())
    return " ".join(f"{method}={results[method]}" for method in _AUTH_METHODS if method in results)


def _attachment_names(message: EmailMessage) -> list[str]:
    """File names only; attachment content is never read."""
    names = []
    for part in message.walk():
        if part.is_multipart():
            continue
        if part.get_filename() or part.get_content_disposition() == "attachment":
            name = _one_line(part.get_filename() or "")
            if name:
                names.append(name)
    return names


def _part_text(part: EmailMessage) -> str:
    """Decoded text of a body part. Without a declared charset (or with ASCII) it is read as UTF-8, a superset of ASCII;
    an unknown charset also falls back to UTF-8. Unreadable characters are replaced."""
    payload = part.get_payload(decode=True)
    if not isinstance(payload, bytes):
        return ""
    charset = part.get_content_charset()
    if charset in (None, "us-ascii", "ascii"):
        charset = "utf-8"
    try:
        return payload.decode(charset, errors="replace")
    except LookupError:
        return payload.decode("utf-8", errors="replace")


class _HtmlExtractor(HTMLParser):
    """Visible text (script and style dropped) and (visible text, href) pairs of the links."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.chunks: list[str] = []
        self.links: list[tuple[str, str]] = []
        self._hidden_depth = 0
        self._link_href: str | None = None
        self._link_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in _HIDDEN_TAGS:
            self._hidden_depth += 1
        elif tag in _BLOCK_TAGS:
            self.chunks.append("\n")
        elif tag == "a":
            href = (dict(attrs).get("href") or "").strip()
            self._link_href = href or None
            self._link_text = []

    def handle_endtag(self, tag: str) -> None:
        if tag in _HIDDEN_TAGS and self._hidden_depth > 0:
            self._hidden_depth -= 1
        elif tag in _BLOCK_TAGS:
            self.chunks.append("\n")
        elif tag == "a" and self._link_href is not None:
            self.links.append((_one_line("".join(self._link_text)), _one_line(self._link_href)))
            self._link_href = None

    def handle_data(self, data: str) -> None:
        if self._hidden_depth:
            return
        self.chunks.append(data)
        if self._link_href is not None:
            self._link_text.append(data)

    def text(self) -> str:
        lines = (_one_line(line) for line in "".join(self.chunks).splitlines())
        return "\n".join(line for line in lines if line)


def _parse_html(html: str) -> _HtmlExtractor:
    extractor = _HtmlExtractor()
    extractor.feed(html)
    extractor.close()
    return extractor


def _distinct_links(links: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """A link is repeated only when both its visible text and its destination are equal."""
    return list(dict.fromkeys(links))[:MAX_LINKS]


def build_email_digest(raw: str) -> str:
    """Build the digest documented in docs/requirements.md. Raises InvalidEmailError without a readable text body."""
    # Parsed as bytes: the frontend reads the file as UTF-8, so 8-bit bodies keep their original bytes.
    message = email.message_from_bytes(raw.encode("utf-8", errors="surrogateescape"), policy=default)
    if not isinstance(message, EmailMessage):
        raise InvalidEmailError("Unexpected message type")

    plain_part = message.get_body(preferencelist=("plain",))
    html_part = message.get_body(preferencelist=("html",))
    html = _parse_html(_part_text(html_part)) if html_part is not None else None

    # The text/plain part wins; the HTML text is used only when there is no plain text.
    body = _part_text(plain_part).strip() if plain_part is not None else ""
    if not body and html is not None:
        body = html.text().strip()
    if not body:
        raise InvalidEmailError("No readable text body")

    lines = [f"{label}: {value}" for name, label in _HEADER_LINES if (value := _header(message, name))]
    if authentication := _authentication(message):
        lines.append(f"Autenticación: {authentication}")
    if attachments := _attachment_names(message):
        lines.append(f"Adjuntos: {', '.join(attachments)}")
    if links := _distinct_links(html.links if html is not None else []):
        lines.append("Enlaces:")
        lines.extend(f'- "{text}" -> {href}' for text, href in links)
    lines.append("Cuerpo:")
    lines.append(body[:MAX_BODY_CHARS])
    return "\n".join(lines)
