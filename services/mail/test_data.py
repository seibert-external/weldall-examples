import re

import data
import data_en

# Fields that IDs, links, filters and code read: equal in both languages.
CODE = re.compile(
    r"^(id|key|.*Id|.*Ids|status|folder|tags|email|tickets|contracts|deals|receivedAt|read|flagged|size)$"
)
STRUCTURED = re.compile(r"^(\d{4}-\d{2}-\d{2}|[A-Z]+-\d+|https?://\S+|\S+@\S+)")
TOKEN = re.compile(r"\[\[\d{4}-\d{2}-\d{2}\]\]")


def compare(de, en, path="", key=""):
    """Only free text may differ between the German and the English records."""
    if isinstance(de, str) and isinstance(en, str):
        if CODE.match(key) or STRUCTURED.match(de):
            return [] if de == en else [f"{path}: {de} != {en}"]
        return [] if TOKEN.findall(de) == TOKEN.findall(en) else [f"{path}: date tokens differ"]
    if isinstance(de, list) and isinstance(en, list):
        if len(de) != len(en):
            return [f"{path}: length {len(de)} != {len(en)}"]
        return [
            d
            for i, (a, b) in enumerate(zip(de, en, strict=True))
            for d in compare(a, b, f"{path}[{i}]", key)
        ]
    if isinstance(de, dict) and isinstance(en, dict):
        if sorted(de) != sorted(en):
            return [f"{path}: keys differ"]
        return [d for k in sorted(de) for d in compare(de[k], en[k], f"{path}.{k}", k)]
    return [] if de == en else [f"{path}: {de!r} != {en!r}"]


def exports(module):
    return {name: value for name, value in vars(module).items() if name.isupper()}


def test_english_data_matches_german_in_everything_but_free_text():
    assert compare(exports(data), exports(data_en)) == []


def test_comparison_catches_a_changed_code_id_or_date_token():
    de = {"id": "msg-1018", "folder": "Posteingang", "body": "bis [[2026-10-31]]"}
    assert compare(de, {**de, "body": "by [[2026-10-31]]"}) == []
    assert len(compare(de, {**de, "folder": "Inbox"})) == 1
    assert len(compare(de, {**de, "id": "msg-1019"})) == 1
    assert len(compare(de, {**de, "body": "by [[2026-11-01]]"})) == 1
