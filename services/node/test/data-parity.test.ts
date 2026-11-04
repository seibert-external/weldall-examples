import assert from "node:assert/strict";
import { test } from "node:test";
import * as contractsDe from "../src/contracts/data.js";
import * as contractsEn from "../src/contracts/data.en.js";
import * as crmDe from "../src/crm/data.js";
import * as crmEn from "../src/crm/data.en.js";
import * as ticketsDe from "../src/tickets/data.js";
import * as ticketsEn from "../src/tickets/data.en.js";
import * as wikiDe from "../src/wiki/data.js";
import * as wikiEn from "../src/wiki/data.en.js";

// Fields that IDs, links, filters and code read: equal in both languages.
const CODE = /^(id|key|number|.*Id|.*Ids|status|priority|type|stage|space|folder|tags|direction|currency|email|website|from|to)$/;
const STRUCTURED = /^(\d{4}-\d{2}-\d{2}|[A-Z]+-\d+|https?:\/\/\S+|\S+@\S+)/;
const tokens = (text: string) => text.match(/\[\[\d{4}-\d{2}-\d{2}\]\]/g) ?? [];

/** Only free text may differ between the German and the English records. */
export function compare(de: unknown, en: unknown, path = "", key = ""): string[] {
  if (typeof de === "string" && typeof en === "string") {
    if (CODE.test(key) || STRUCTURED.test(de)) return de === en ? [] : [`${path}: ${de} != ${en}`];
    return tokens(de).join() === tokens(en).join() ? [] : [`${path}: date tokens differ`];
  }
  if (Array.isArray(de) && Array.isArray(en)) {
    if (de.length !== en.length) return [`${path}: length ${de.length} != ${en.length}`];
    return de.flatMap((item, i) => compare(item, en[i], `${path}[${i}]`, key));
  }
  if (de && en && typeof de === "object" && typeof en === "object") {
    const keys = Object.keys(de).sort();
    if (keys.join() !== Object.keys(en).sort().join()) return [`${path}: keys differ`];
    return keys.flatMap((k) => compare((de as any)[k], (en as any)[k], `${path}.${k}`, k));
  }
  return de === en ? [] : [`${path}: ${String(de)} != ${String(en)}`];
}

test("English data matches German in everything but free text", () => {
  for (const [name, de, en] of [
    ["contracts", contractsDe, contractsEn],
    ["crm", crmDe, crmEn],
    ["tickets", ticketsDe, ticketsEn],
    ["wiki", wikiDe, wikiEn],
  ] as const) {
    assert.deepEqual(compare({ ...de }, { ...en }, name), []);
  }
});

test("the comparison catches a changed code, ID, number or date token", () => {
  const de = { id: "deal-201", stage: "angebot", value: 5, text: "bis [[2026-10-31]]" };
  assert.deepEqual(compare(de, { ...de, text: "by [[2026-10-31]]" }), []);
  assert.equal(compare(de, { ...de, stage: "proposal" }).length, 1);
  assert.equal(compare(de, { ...de, id: "deal-202" }).length, 1);
  assert.equal(compare(de, { ...de, value: 6 }).length, 1);
  assert.equal(compare(de, { ...de, text: "by [[2026-11-01]]" }).length, 1);
});
