"""Portable date formatting helpers.

`strftime("%-d")` (no zero-padding) works on Linux/macOS but raises
`ValueError: Invalid format string` on Windows, where the equivalent is
`%#d`. These helpers avoid platform-specific directives entirely.
"""

from datetime import date, datetime


def format_long_date(d: date | datetime) -> str:
    """e.g. 'Wednesday, October 21, 2026' (day not zero-padded)."""
    return f"{d:%A, %B} {d.day}, {d.year}"


def format_short_date(d: date | datetime) -> str:
    """e.g. 'Tue Oct 13' (day not zero-padded)."""
    return f"{d:%a %b} {d.day}"
