"""Same calendar rule as services/node/src/shared/dates.ts.

Records are written as of 28 October 2026 and move by whole days: timestamps and
[[YYYY-MM-DD]] in prose (which becomes a German date), so mail stays consistent
with the contract register and tells the same story on every day.
"""

import re
from datetime import UTC, date, datetime, timedelta

ANCHOR_DAY = date(2026, 10, 28)
TIMESTAMP = re.compile(r"^\d{4}-\d{2}-\d{2}T")
TOKEN = re.compile(r"\[\[(\d{4}-\d{2}-\d{2})\]\]")


def shift(now: datetime) -> int:
    return max(0, (now.date() - ANCHOR_DAY).days)


def shift_all(value, days: int):
    if isinstance(value, str):
        if TIMESTAMP.match(value):
            return (datetime.fromisoformat(value) + timedelta(days=days)).isoformat()
        return TOKEN.sub(
            lambda m: (date.fromisoformat(m[1]) + timedelta(days=days)).strftime("%d.%m.%Y"),
            value,
        )
    if isinstance(value, list):
        return [shift_all(item, days) for item in value]
    if isinstance(value, dict):
        return {key: shift_all(item, days) for key, item in value.items()}
    return value


def utc_now() -> datetime:
    return datetime.now(UTC)
