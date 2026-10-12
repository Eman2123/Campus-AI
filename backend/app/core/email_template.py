"""Branded HTML layout for every transactional email Campus AI sends.

Mirrors the pixel brand from frontend/lib/design-tokens.ts (yellow + white +
black, thick borders, hard offset shadows). Email clients ignore most modern
CSS, so this is table-based with inline styles only — no <style> blocks, no
web fonts, no images — which also keeps it safe in Gmail, Outlook and Apple
Mail.

Everything dynamic (names, deadline titles) goes through html.escape, because
those values are typed by students and must never be able to inject markup.
"""

from html import escape

from app.core.config import settings

# The real Campus AI logo (frontend/public/campus-ai-logo.png, 931x241). Email
# clients block SVG and data: URIs, so it has to be a PNG served from the
# public frontend origin. The header is white because the logo's pixel "C" is
# yellow and would disappear on a yellow band.
LOGO_PATH = "/campus-ai-logo.png"
LOGO_WIDTH = 186
LOGO_HEIGHT = 48

BRAND_YELLOW = "#FACC15"
BRAND_YELLOW_SOFT = "#FEF9C3"
BRAND_BLACK = "#171717"
BRAND_WHITE = "#FFFFFF"
MUTED = "#52525B"

_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"


def _paragraph(text: str) -> str:
    return (
        f'<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:{BRAND_BLACK};">'
        f"{escape(text)}</p>"
    )


def _button(label: str, url: str) -> str:
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">'
        "<tr>"
        f'<td style="background:{BRAND_YELLOW};border:3px solid {BRAND_BLACK};'
        f'box-shadow:4px 4px 0 0 {BRAND_BLACK};">'
        f'<a href="{escape(url, quote=True)}" style="display:inline-block;padding:12px 24px;'
        f"font-family:{_FONT};font-size:16px;font-weight:700;color:{BRAND_BLACK};"
        f'text-decoration:none;">{escape(label)}</a>'
        "</td></tr></table>"
    )


def _items(rows: list[tuple[str, str, str]]) -> str:
    """rows: (date label, title, kind label)."""
    cells = []
    for when, title, kind in rows:
        cells.append(
            "<tr>"
            f'<td style="padding:10px 12px;border-bottom:2px solid {BRAND_BLACK};'
            f'font-size:14px;font-weight:700;color:{BRAND_BLACK};white-space:nowrap;'
            f'vertical-align:top;">{escape(when)}</td>'
            f'<td style="padding:10px 12px;border-bottom:2px solid {BRAND_BLACK};'
            f'font-size:15px;color:{BRAND_BLACK};">{escape(title)}'
            f'<br><span style="font-size:12px;color:{MUTED};">{escape(kind)}</span></td>'
            "</tr>"
        )
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="margin:8px 0 24px;border:3px solid {BRAND_BLACK};background:{BRAND_YELLOW_SOFT};">'
        + "".join(cells)
        + "</table>"
    )


def render_email(
    heading: str,
    paragraphs: list[str],
    *,
    button: tuple[str, str] | None = None,
    items: list[tuple[str, str, str]] | None = None,
    closing: str | None = None,
    preheader: str = "",
    logo_url: str | None = None,
) -> str:
    """Returns a complete branded HTML document.

    `button` is (label, url). `items` is a list of (date, title, kind) shown as
    a bordered agenda table. `closing` is the muted fine print under the card.
    `logo_url` overrides the default `<FRONTEND_URL>/campus-ai-logo.png`.
    """
    logo_src = logo_url or f"{settings.FRONTEND_URL.rstrip('/')}{LOGO_PATH}"
    body_parts = [
        f'<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:{BRAND_BLACK};">'
        f"{escape(heading)}</h1>"
    ]
    body_parts += [_paragraph(p) for p in paragraphs]
    if items:
        body_parts.append(_items(items))
    if button:
        body_parts.append(_button(*button))
    if closing:
        body_parts.append(
            f'<p style="margin:0;font-size:13px;line-height:1.6;color:{MUTED};">{escape(closing)}</p>'
        )

    return (
        "<!DOCTYPE html>"
        '<html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta name="color-scheme" content="light only">'
        f"<title>{escape(heading)}</title></head>"
        f'<body style="margin:0;padding:0;background:{BRAND_YELLOW_SOFT};font-family:{_FONT};">'
        f'<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{escape(preheader)}</div>'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background:{BRAND_YELLOW_SOFT};"><tr><td align="center" style="padding:32px 16px;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="max-width:560px;background:{BRAND_WHITE};border:3px solid {BRAND_BLACK};'
        f'box-shadow:6px 6px 0 0 {BRAND_BLACK};">'
        # Header: real logo on white, then a yellow pixel stripe
        f'<tr><td style="background:{BRAND_WHITE};padding:20px 28px;">'
        f'<img src="{escape(logo_src, quote=True)}" alt="Campus AI" width="{LOGO_WIDTH}" '
        f'height="{LOGO_HEIGHT}" style="display:block;border:0;outline:none;'
        f'font-size:22px;font-weight:800;color:{BRAND_BLACK};"></td></tr>'
        f'<tr><td style="background:{BRAND_YELLOW};height:10px;line-height:10px;font-size:0;'
        f'border-top:3px solid {BRAND_BLACK};border-bottom:3px solid {BRAND_BLACK};">&nbsp;</td></tr>'
        # Content
        f'<tr><td style="padding:28px;">{"".join(body_parts)}</td></tr>'
        # Footer
        f'<tr><td style="background:{BRAND_BLACK};padding:16px 28px;font-size:12px;color:{BRAND_WHITE};">'
        "Campus AI &mdash; your notes, your study plan, your pace."
        "</td></tr></table></td></tr></table></body></html>"
    )
