import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp, slaState } from "../src/tickets/app.js";
import { TICKETS } from "../src/tickets/data.js";
import { fixture } from "./helpers.js";

test("open tickets come first by priority, with the SLA clock", async () => {
  const { get } = await fixture(createApp, "tickets", new Date("2026-10-28T10:00:00+01:00"));
  const open = (await get("/api/tickets?open=true")).items;
  assert.equal(open[0].key, "SVC-1042");
  assert.deepEqual(open[0].slaState, { clock: "Wiederherstellung", due: "2026-10-28T14:10:00Z", minutesLeft: 220, state: "due-soon" });
  assert.equal((await get("/api/tickets?customerId=org-200")).total, 2);
  assert.equal((await get("/api/tickets/svc-1042")).item.history.length, 7);
});

test("SLA states: due soon, breached, paused while waiting for the customer", () => {
  const ticket = TICKETS.find((t) => t.key === "SVC-1042")!;
  assert.equal(slaState(ticket, new Date("2026-10-28T12:00:00+01:00"))?.state, "due-soon");
  assert.equal(slaState(ticket, new Date("2026-10-28T16:00:00+01:00"))?.state, "breached");
  assert.equal(slaState(TICKETS.find((t) => t.key === "SVC-1041")!, new Date("2026-10-28T10:00:00+01:00")), null);
});

test("timestamps move by whole days and the SLA clock reads the same at any hour", async () => {
  const { get } = await fixture(createApp, "tickets", new Date("2026-12-03T17:45:00+01:00"));
  const ticket = (await get("/api/tickets/SVC-1042")).item;
  assert.equal(ticket.created.slice(0, 10), "2026-12-02");
  assert.equal(ticket.slaState.minutesLeft, 220);
});

test("native MCP: ticket card view", async () => {
  const { rpc } = await fixture(createApp, "tickets");
  const result = (await rpc("tools/call", { name: "get_ticket", arguments: { key: "SVC-1042" } })).result;
  assert.equal(result.structuredContent.mode, "ticket");
  assert.match(result.content[0].text, /\[intern\]/);
  assert.equal((await rpc("tools/call", { name: "get_ticket", arguments: { key: "SVC-1" } })).result.isError, true);
});

test("tool text names the demo clock's time, so the SLA is not counted again from the real hour", async () => {
  const { rpc } = await fixture(createApp, "tickets", new Date("2026-12-03T20:15:00+01:00"));
  const result = (await rpc("tools/call", { name: "list_tickets", arguments: { open: true } })).result;
  assert.match(result.content[0].text, /^Stand 03\.12\.26, 11:30 Uhr\./);
  const ticket = (await rpc("tools/call", { name: "get_ticket", arguments: { key: "SVC-1042" } })).result;
  assert.match(ticket.content[0].text, /^Stand 03\.12\.26, 11:30 Uhr\./);
});

test("English: tool text, records and labels in English; German stays the default", async () => {
  const { rpc, get } = await fixture(createApp, "tickets", new Date("2026-12-03T20:15:00+01:00"));
  const list = (await rpc("tools/call", { name: "list_tickets", arguments: { open: true, language: "en" } })).result;
  assert.equal(list.structuredContent.language, "en");
  assert.equal(list.structuredContent.filter.language, undefined);
  const text = list.content[0].text;
  assert.match(text, /^As of 3 Dec 2026, 11:30\. SLA deadlines apply as of this time\./);
  assert.match(text, /- SVC-1042 · Critical · In progress · PM3 dryer section main drive.* · Restoration SLA due 3 Dec 2026, 15:10/);
  assert.equal(list.structuredContent.items[0].slaState.clock, "Restoration");
  assert.equal(list.structuredContent.items[0].priority, "Kritisch");

  const ticket = (await rpc("tools/call", { name: "get_ticket", arguments: { key: "SVC-1042", language: "en" } })).result;
  assert.equal(ticket.structuredContent.language, "en");
  assert.match(ticket.content[0].text, /Konstantin Weber: Status Open → In progress/);
  assert.match(ticket.content[0].text, /Lea Brandt: assigned to Konstantin Weber/);
  assert.match(ticket.content[0].text, /\[internal\] The restoration SLA ends today/);
  assert.match((await rpc("tools/call", { name: "get_ticket", arguments: { key: "SVC-1", language: "en" } })).result.content[0].text, /^There is no ticket SVC-1\./);

  const german = (await rpc("tools/call", { name: "list_tickets", arguments: { open: true } })).result;
  assert.equal(german.structuredContent.language, "de");
  assert.match(german.content[0].text, /- SVC-1042 · Kritisch · In Arbeit · .* · SLA Wiederherstellung bis 03\.12\.26, 15:10/);

  assert.match((await get("/api/tickets/SVC-1042?lang=en")).item.summary, /^PM3 dryer section main drive/);
  assert.equal((await get("/api/tickets?open=true&lang=en")).items[0].slaState.clock, "Restoration");
  assert.equal((await get("/api/team?lang=en")).items[0].role, "Head of Service");
  assert.equal((await get("/api/tickets/SVC-1042")).item.slaState.clock, "Wiederherstellung");
});
