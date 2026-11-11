import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp, freeSlots, practiceDay } from "../src/praxis/app.js";
import { PATIENTS, weekStart } from "../src/praxis/data.js";
import { fixture } from "./helpers.js";

test("recall: the same patients are overdue by the same days on any day", async () => {
  const first = await fixture(createApp, "praxis", new Date("2026-11-12T09:00:00+01:00"));
  const later = await fixture(createApp, "praxis", new Date("2026-12-03T20:15:00+01:00"));
  const a = (await first.get("/api/recall")).items;
  const b = (await later.get("/api/recall")).items;
  assert.ok(a.length > 20 && a.length < 60, `overdue count ${a.length}`);
  assert.deepEqual(a.map((p: any) => [p.id, p.overdueDays]), b.map((p: any) => [p.id, p.overdueDays]));
  assert.ok(a.every((p: any) => p.overdueDays > 0 && p.nextAppointment === null), "overdue patients have nothing booked");
  assert.ok((await first.get("/api/recall?dueWithinDays=30")).total > a.length);
});

test("next week starts on a Monday and only offers weekdays, with prophylaxis gaps", () => {
  for (const today of ["2026-11-12", "2026-11-14", "2026-11-16"]) {
    const week = freeSlots(practiceDay(today), "next");
    assert.equal(new Date(`${week.monday}T12:00:00Z`).getUTCDay(), 1);
    assert.equal(week.monday, weekStart(week.days[4]!.date));
    assert.ok(week.days.flatMap((d) => d.slots).filter((s) => s.prophylaxis).length >= 8);
  }
});

test("no-shows are highest on Mondays and Fridays", async () => {
  const { get } = await fixture(createApp, "praxis", new Date("2026-11-12T09:00:00+01:00"));
  const rates = (await get("/api/no-shows")).rates as { weekday: number; rate: number }[];
  const [first, second] = [...rates].sort((x, y) => y.rate - x.rate);
  assert.deepEqual([first!.weekday, second!.weekday].sort(), [0, 4]);
});

test("native MCP: cockpit, week plan, patient card; unknown patient is an error", async () => {
  const { rpc } = await fixture(createApp, "praxis", new Date("2026-11-12T09:00:00+01:00"));
  const tools = (await rpc("tools/list", {})).result.tools.map((t: any) => t.name).sort();
  assert.deepEqual(tools, ["free_slots", "get_patient", "list_recall", "no_show_rates"]);
  const cockpit = (await rpc("tools/call", { name: "list_recall", arguments: {} })).result;
  assert.equal(cockpit.structuredContent.mode, "cockpit");
  assert.match(cockpit.content[0].text, /^Stand 12\.11\.2026\. \d+ von 140 Patienten sind mit der Prophylaxe überfällig/);
  assert.ok(cockpit.structuredContent.prophylaxisSlots.every((s: any) => s.practitioner === "herbst"));
  const slots = (await rpc("tools/call", { name: "free_slots", arguments: { practitioner: "herbst" } })).result;
  assert.equal(slots.structuredContent.mode, "slots");
  const id = cockpit.structuredContent.items[0].id;
  const card = (await rpc("tools/call", { name: "get_patient", arguments: { id } })).result;
  assert.equal(card.structuredContent.mode, "patient");
  assert.equal(card.structuredContent.item.id, id);
  assert.equal((await rpc("tools/call", { name: "get_patient", arguments: { id: "P-0001" } })).result.isError, true);
});

test("English: text and labels in English, codes stay German", async () => {
  const { rpc, get } = await fixture(createApp, "praxis", new Date("2026-11-12T09:00:00+01:00"));
  const result = (await rpc("tools/call", { name: "list_recall", arguments: { language: "en" } })).result;
  assert.match(result.content[0].text, /^As of 12 Nov 2026\. \d+ of 140 patients are overdue/);
  assert.equal(result.structuredContent.language, "en");
  const mail = PATIENTS.find((p) => p.contact === "E-Mail")!;
  const card = (await rpc("tools/call", { name: "get_patient", arguments: { id: mail.id, language: "en" } })).result;
  assert.equal(card.structuredContent.item.contact, "E-Mail");
  assert.equal(card.structuredContent.item.contactLabel, "Email");
  assert.equal((await get(`/api/patients/${mail.id}?lang=en`)).item.contactLabel, "Email");
});

test("the API is read-only and needs the praxis scope", async () => {
  const { app, request } = await fixture(createApp, "praxis");
  const write = await app.fetch(await request(`/api/patients/${PATIENTS[0]!.id}`, { method: "DELETE" }));
  assert.equal(write.status, 405);
  const other = await app.fetch(await request("/api/recall", { scopes: ["contracts:read"] }));
  assert.equal(other.status, 401);
});
