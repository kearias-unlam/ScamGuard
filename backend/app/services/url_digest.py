"""URL digest (US-6.3): split a pasted link into labeled parts for the analyzer and the evidence check.
Format and rules: docs/requirements.md, URL digest. Standard library only; the link is never opened or stored."""

import ipaddress
import re
from urllib.parse import SplitResult, urlsplit

# Fixed list (docs/requirements.md, URL digest). Defined once here.
KNOWN_SHORTENERS = frozenset({
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "ow.ly",
    "is.gd",
    "cutt.ly",
    "rebrand.ly",
    "shorturl.at",
    "acortar.link",
    "rb.gy",
    "t.ly",
})

_ALLOWED_SCHEMES = ("http", "https")
_SCHEME_WITH_SLASHES = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*://")
# "javascript:", "mailto:", "data:"; a colon followed by a digit is a port ("ejemplo.com:8080").
_OTHER_SCHEME = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*:(?!\d)")


class InvalidUrlError(Exception):
    """The text is not a valid http or https link. Never carries the link."""


def _split(link: str) -> tuple[SplitResult, int | None, bool]:
    """Parse the link, adding "http://" when it has no scheme. Returns the parts, the port, and whether
    the user wrote the scheme."""
    if _SCHEME_WITH_SLASHES.match(link):
        has_scheme, target = True, link
    elif _OTHER_SCHEME.match(link):
        raise InvalidUrlError("unsupported scheme")
    else:
        has_scheme, target = False, f"http://{link}"
    try:
        parts = urlsplit(target)
        port = parts.port  # Raises ValueError when not a number from 0 to 65535.
    except ValueError as error:
        raise InvalidUrlError("unparseable link") from error
    if parts.scheme.lower() not in _ALLOWED_SCHEMES:
        raise InvalidUrlError("unsupported scheme")
    return parts, port, has_scheme


def _is_ip(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
    except ValueError:
        return False
    return True


def _punycode_forms(host: str) -> tuple[str, str]:
    """Readable form for "Dominio" and ASCII form for "Dominio en punycode". A host that cannot be converted
    is shown as is, and its ASCII form equals it, so the punycode line is omitted."""
    try:
        ascii_host = host.encode("idna").decode("ascii")
        readable = host.encode("ascii").decode("idna") if host.isascii() else host
    except UnicodeError:
        return host, host
    return readable, ascii_host


def _is_shortener(host: str) -> bool:
    """Exact match or a subdomain of a known shortener ("www.bit.ly" matches, "notbit.ly" does not)."""
    return any(host == shortener or host.endswith(f".{shortener}") for shortener in KNOWN_SHORTENERS)


def build_url_digest(raw: str) -> str:
    """Build the URL digest. Raises InvalidUrlError when the text is not a valid http or https link."""
    link = raw.strip()
    # Also keeps the "Enlace:" line on a single line.
    if any(character.isspace() for character in link):
        raise InvalidUrlError("whitespace in link")
    parts, port, has_scheme = _split(link)

    host = (parts.hostname or "").removesuffix(".")  # hostname is already lowercase, without brackets.
    if not host:
        raise InvalidUrlError("no host")
    is_ip = _is_ip(host)
    if not is_ip and "." not in host:
        raise InvalidUrlError("host without a dot")
    readable_host, ascii_host = (host, host) if is_ip else _punycode_forms(host)
    # Raw text, so the line is a literal part of "Enlace" for the evidence check.
    userinfo = parts.netloc.rpartition("@")[0]

    lines = [
        f"Enlace: {link}",
        f"Protocolo: {parts.scheme.lower() if has_scheme else 'ninguno'}",
        f"Dominio: {readable_host}",
    ]
    if ascii_host != readable_host:
        lines.append(f"Dominio en punycode: {ascii_host}")
    if is_ip:
        lines.append("Dirección IP: sí")
    if userinfo:
        lines.append(f"Usuario antes de @: {userinfo}")
    if port is not None:
        lines.append(f"Puerto: {port}")
    if _is_shortener(host):
        lines.append("Acortador de enlaces: sí")
    # Path and query stay raw (not percent-decoded): quotable, and encoded characters remain visible.
    if parts.path not in ("", "/"):
        lines.append(f"Ruta: {parts.path}")
    if parts.query:
        lines.append(f"Parámetros: {parts.query}")
    return "\n".join(lines)
