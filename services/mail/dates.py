"""Same calendar rule as services/node/src/shared/dates.ts.

Records are written as of 28 October 2026 and move by whole days: timestamps and
[[YYYY-MM-DD]] in prose (which becomes 31.12.2026 in German, 31 Dec 2026 in
English), so mail stays consistent with the contract register and tells the same
story on every day.
"""

import re
from datetime import UTC, date, datetime, timedelta

ANCHOR_DAY = date(2026, 10, 28)
TIMESTAMP = re.compile(r"^\d{4}-\d{2}-\d{2}T")
TOKEN = re.compile(r"\[\[(\d{4}-\d{2}-\d{2})\]\]")


def shift(now: datetime) -> int:
    return max(0, (now.date() - ANCHOR_DAY).days)


MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def local_date(day: date, lang: str = "de") -> str:
    """31.12.2026 in German, 31 Dec 2026 in English."""
    if lang == "en":
        return f"{day.day} {MONTHS[day.month - 1]} {day.year}"
    return day.strftime("%d.%m.%Y")


def shift_all(value, days: int, lang: str = "de"):
    if isinstance(value, str):
        if TIMESTAMP.match(value):
            return (datetime.fromisoformat(value) + timedelta(days=days)).isoformat()
        return TOKEN.sub(
            lambda m: local_date(date.fromisoformat(m[1]) + timedelta(days=days), lang),
            value,
        )
    if isinstance(value, list):
        return [shift_all(item, days, lang) for item in value]
    if isinstance(value, dict):
        return {key: shift_all(item, days, lang) for key, item in value.items()}
    return value


def utc_now() -> datetime:
    return datetime.now(UTC)
