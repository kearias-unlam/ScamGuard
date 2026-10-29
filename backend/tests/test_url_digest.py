# US-6.3: URL digest built from a pasted link (docs/requirements.md, URL digest).
import pytest

from app.services.url_digest import InvalidUrlError, build_url_digest


def _lines(digest: str) -> list[str]:
    return digest.split("\n")


def test_full_https_link_builds_digest() -> None:
    digest = build_url_digest("  https://mercadopago-seguridad.com/login?user=ana&next=/pago#top  ")

    assert digest == (
        "Enlace: https://mercadopago-seguridad.com/login?user=ana&next=/pago#top\n"
        "Protocolo: https\n"
        "Dominio: mercadopago-seguridad.com\n"
        "Ruta: /login\n"
        "Parámetros: user=ana&next=/pago"
    )


def test_link_without_scheme_has_no_protocol() -> None:
    lines = _lines(build_url_digest("ejemplo.com/promo"))

    assert lines[:3] == ["Enlace: ejemplo.com/promo", "Protocolo: ninguno", "Dominio: ejemplo.com"]


def test_link_without_scheme_keeps_its_port() -> None:
    lines = _lines(build_url_digest("ejemplo.com:8080"))

    assert "Protocolo: ninguno" in lines
    assert "Puerto: 8080" in lines


def test_http_and_uppercase_scheme_and_host_are_lowercased() -> None:
    lines = _lines(build_url_digest("HTTP://Banco-Nacion.COM.AR"))

    assert lines[1:3] == ["Protocolo: http", "Dominio: banco-nacion.com.ar"]


def test_empty_path_and_query_omit_their_lines() -> None:
    digest = build_url_digest("https://ejemplo.com/")

    assert digest == "Enlace: https://ejemplo.com/\nProtocolo: https\nDominio: ejemplo.com"


@pytest.mark.parametrize(("link", "host"), [("http://192.168.0.10/login", "192.168.0.10"), ("http://[::1]:8080/", "::1")])
def test_ip_hosts_are_marked(link: str, host: str) -> None:
    lines = _lines(build_url_digest(link))

    assert f"Dominio: {host}" in lines
    assert "Dirección IP: sí" in lines


def test_userinfo_before_at_is_listed_as_written() -> None:
    lines = _lines(build_url_digest("https://www.banco.com@estafa.xyz/ingreso"))

    assert "Dominio: estafa.xyz" in lines
    assert "Usuario antes de @: www.banco.com" in lines


def test_explicit_port_is_listed() -> None:
    assert "Puerto: 8443" in _lines(build_url_digest("https://ejemplo.com:8443/x"))


def test_punycode_host_is_shown_decoded_with_its_ascii_form() -> None:
    lines = _lines(build_url_digest("https://xn--pypal-4ve.com/"))

    assert "Dominio: pаypal.com" in lines  # Cyrillic "а".
    assert "Dominio en punycode: xn--pypal-4ve.com" in lines


def test_unicode_host_also_shows_its_ascii_form() -> None:
    lines = _lines(build_url_digest("https://pаypal.com"))

    assert "Dominio en punycode: xn--pypal-4ve.com" in lines


def test_host_that_is_not_valid_punycode_is_shown_as_is() -> None:
    digest = build_url_digest("https://xn--zz.com")

    assert "Dominio: xn--zz.com" in _lines(digest)
    assert "Dominio en punycode" not in digest


@pytest.mark.parametrize("link", ["https://bit.ly/3abc", "www.bit.ly/3abc", "acortar.link/x"])
def test_known_shorteners_are_marked(link: str) -> None:
    assert "Acortador de enlaces: sí" in _lines(build_url_digest(link))


@pytest.mark.parametrize("link", ["https://notbit.ly/x", "https://bit.ly.example.com/x"])
def test_lookalikes_of_shorteners_are_not_marked(link: str) -> None:
    assert "Acortador de enlaces" not in build_url_digest(link)


def test_trailing_dot_is_removed_from_the_host() -> None:
    assert "Dominio: ejemplo.com" in _lines(build_url_digest("https://ejemplo.com./"))


def test_percent_encoding_is_kept_raw() -> None:
    lines = _lines(build_url_digest("https://ejemplo.com/%61dmin?q=%2F"))

    assert "Ruta: /%61dmin" in lines
    assert "Parámetros: q=%2F" in lines


@pytest.mark.parametrize(
    "link",
    [
        "https://ejemplo .com",
        "https://ejemplo.com/a\nb",
        "ftp://ejemplo.com",
        "javascript:alert(1)",
        "mailto:ana@ejemplo.com",
        "https://",
        "https://usuario@",
        "https://ejemplo",
        "localhost:3000",
        "https://ejemplo.com:99999",
        "https://ejemplo.com:abc",
        "http://[::1",
        "https://com.",
    ],
)
def test_invalid_links_raise(link: str) -> None:
    with pytest.raises(InvalidUrlError) as error:
        build_url_digest(link)

    assert link.strip() not in str(error.value)  # The error never carries the link.
