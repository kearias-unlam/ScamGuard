# US-4.3: email digest built from a raw .eml file (docs/requirements.md, Email digest).
from email.message import EmailMessage

import pytest

from app.services.email_digest import MAX_BODY_CHARS, InvalidEmailError, build_email_digest


def _eml(
    body: str | None = "Hola",
    *,
    html: str | None = None,
    headers: dict[str, str] | None = None,
    attachments: tuple[tuple[str, bytes], ...] = (),
) -> str:
    message = EmailMessage()
    default_headers = {"From": "Banco <soporte@banco.com>", "Subject": "Aviso"}
    for name, value in (default_headers if headers is None else headers).items():
        message[name] = value
    if body is not None:
        message.set_content(body)
        if html is not None:
            message.add_alternative(html, subtype="html")
    elif html is not None:
        message.set_content(html, subtype="html")
    for filename, content in attachments:
        message.add_attachment(content, maintype="application", subtype="octet-stream", filename=filename)
    return message.as_string()


def _lines(digest: str) -> list[str]:
    return digest.split("\n")


def test_plain_text_email_builds_digest() -> None:
    digest = build_email_digest(_eml("Ingresá tu clave acá"))

    assert digest == "De: Banco <soporte@banco.com>\nAsunto: Aviso\nCuerpo:\nIngresá tu clave acá"


def test_html_only_email_extracts_text_and_lists_links() -> None:
    html = (
        "<html><head><style>.x{color:red}</style><script>alert('hola')</script></head>"
        "<body><p>Tu cuenta fue bloqueada.</p>"
        '<p><a href="http://evil.example/x">www.banco.com</a></p></body></html>'
    )

    digest = build_email_digest(_eml(None, html=html))

    assert 'Enlaces:\n- "www.banco.com" -> http://evil.example/x' in digest
    assert digest.endswith("Cuerpo:\nTu cuenta fue bloqueada.\nwww.banco.com")
    assert "alert" not in digest and "color:red" not in digest


def test_plain_body_preferred_and_links_from_html_alternative() -> None:
    digest = build_email_digest(
        _eml("Texto plano", html='<p>Texto HTML <a href="http://evil.example">Ver cuenta</a></p>'),
    )

    assert '- "Ver cuenta" -> http://evil.example' in _lines(digest)
    assert digest.endswith("Cuerpo:\nTexto plano")


def test_blank_plain_body_falls_back_to_html() -> None:
    digest = build_email_digest(_eml("   ", html="<p>Solo HTML</p>"))

    assert digest.endswith("Cuerpo:\nSolo HTML")


def test_sender_reply_to_and_return_path_lines() -> None:
    digest = build_email_digest(_eml(headers={
        "From": "Banco Nación <soporte@bna-seguridad.com>",
        "Reply-To": "ayuda.bna@gmail.com",
        "Return-Path": "<rebote@otro-dominio.com>",
    }))

    assert _lines(digest)[:3] == [
        "De: Banco Nación <soporte@bna-seguridad.com>",
        "Responder a: ayuda.bna@gmail.com",
        "Dirección de retorno: <rebote@otro-dominio.com>",
    ]


def test_encoded_headers_are_decoded() -> None:
    raw = (
        "From: =?utf-8?b?QmFuY28gTmFjacOzbg==?= <soporte@bna.com>\r\n"
        "Subject: =?utf-8?q?Verificaci=C3=B3n_urgente?=\r\n\r\nHola"
    )

    digest = build_email_digest(raw)

    assert "De: Banco Nación <soporte@bna.com>" in _lines(digest)
    assert "Asunto: Verificación urgente" in _lines(digest)


def test_folded_or_encoded_newline_header_stays_on_one_line() -> None:
    folded = build_email_digest("Subject: Linea uno\r\n linea dos\r\n\r\nHola")
    encoded = build_email_digest("Subject: =?utf-8?q?A=0ACuerpo:_falso?=\r\n\r\nHola")

    assert "Asunto: Linea uno linea dos" in _lines(folded)
    assert "Asunto: A Cuerpo: falso" in _lines(encoded)
    assert _lines(encoded).count("Cuerpo:") == 1


def test_authentication_results_topmost_parsed() -> None:
    raw = (
        "Authentication-Results: mx.google.com; dmarc=FAIL; arc=none; spf=softfail; dkim=none\r\n"
        "Authentication-Results: otro.servidor; spf=pass dkim=pass dmarc=pass\r\n"
        "Subject: Aviso\r\n\r\nHola"
    )

    digest = build_email_digest(raw)

    # Only the topmost header counts, in the order spf, dkim, dmarc, lowercase; other methods (arc) are ignored.
    assert "Autenticación: spf=softfail dkim=none dmarc=fail" in _lines(digest)


def test_authentication_results_without_known_methods_omits_line() -> None:
    digest = build_email_digest("Authentication-Results: mx.example; arc=none\r\n\r\nHola")

    assert "Autenticación" not in digest


def test_attachment_names_listed_and_content_never_included() -> None:
    digest = build_email_digest(_eml(attachments=(
        ("factura.pdf.exe", b"CONTENIDO-SECRETO-1"),
        ("nota.txt", b"CONTENIDO-SECRETO-2"),
    )))

    assert "Adjuntos: factura.pdf.exe, nota.txt" in _lines(digest)
    assert "CONTENIDO-SECRETO" not in digest


def test_missing_optional_headers_omit_their_lines() -> None:
    digest = build_email_digest(_eml(headers={}))

    assert digest == "Cuerpo:\nHola"


def test_text_without_headers_is_analyzed_as_body() -> None:
    assert build_email_digest("Ganaste un premio, hacé clic acá") == "Cuerpo:\nGanaste un premio, hacé clic acá"


def test_links_distinct_by_text_and_destination_and_capped() -> None:
    repeated = '<a href="http://a.example">Ver</a>' * 3
    same_destination = '<a href="http://a.example">www.banco.com</a>'
    others = "".join(f'<a href="http://l{index}.example">Link {index}</a>' for index in range(25))

    digest = build_email_digest(_eml(None, html=f"<p>Texto {repeated}{same_destination}{others}</p>"))

    link_lines = [line for line in _lines(digest) if line.startswith("- ")]
    assert len(link_lines) == 20
    assert link_lines[:3] == [
        '- "Ver" -> http://a.example',
        '- "www.banco.com" -> http://a.example',
        '- "Link 0" -> http://l0.example',
    ]


@pytest.mark.parametrize("raw", [
    "Content-Type: text/plain; charset=utf-8\r\n\r\nHacé clic acá",
    "Content-Type: text/plain; charset=iso-8859-1\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\nHac=E9 clic ac=E1",
    "Content-Type: text/plain; charset=x-desconocido\r\n\r\nHacé clic acá",
], ids=["utf-8", "latin-1-quoted-printable", "unknown-charset"])
def test_body_charsets_are_decoded(raw: str) -> None:
    assert build_email_digest(raw).endswith("Cuerpo:\nHacé clic acá")


def test_body_truncated_at_20000_characters() -> None:
    digest = build_email_digest(_eml("a" * (MAX_BODY_CHARS + 500)))

    assert digest.split("Cuerpo:\n", 1)[1] == "a" * MAX_BODY_CHARS


@pytest.mark.parametrize("raw", [
    _eml(None, attachments=(("factura.pdf", b"%PDF"),)),
    _eml(None, html="<script>alert(1)</script><style>p{}</style>"),
    _eml(" \n\t "),
    "",
], ids=["attachment-only", "html-without-visible-text", "blank-plain-body", "empty-input"])
def test_email_without_text_body_raises(raw: str) -> None:
    with pytest.raises(InvalidEmailError):
        build_email_digest(raw)
