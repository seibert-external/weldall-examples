import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../src/crm/app.js";
import { fixture } from "./helpers.js";

test("CRM records, briefing and consistent links to the contract register", async () => {
  const { app, get } = await fixture(createApp, "crm");
  assert.equal((await app.fetch(new Request("http://internal/api/organizations"))).status, 401);
  assert.equal((await get("/api/organizations")).total, 12);
  assert.equal((await get("/api/organizations?status=prospect")).total, 4);
  const briefing = await get("/api/organizations/org-200/briefing");
  assert.deepEqual(briefing.organization.contractIds, ["ctr-1003", "ctr-1004"]);
  assert.equal(briefing.activities[0].date, "2026-10-27", "newest contact first");
  assert.equal(briefing.contacts.length, 3);
  assert.equal((await get("/api/contacts?q=meißner")).items[0].id, "person-200");
});

test("pipeline totals count open deals only and flag what needs attention", async () => {
  const { get } = await fixture(createApp, "crm");
  const pipeline = await get("/api/pipeline");
  const open = pipeline.deals.filter((d: any) => d.open);
  assert.equal(pipeline.totals.openCount, open.length);
  assert.equal(pipeline.totals.open, open.reduce((sum: number, d: any) => sum + d.value, 0));
  const lost = pipeline.deals.find((d: any) => d.id === "deal-801");
  assert.equal(lost.open, false);
  const stale = pipeline.deals.find((d: any) => d.id === "deal-402");
  assert.ok(stale.daysSinceActivity > 30);
  assert.equal((await get("/api/deals?owner=Selin%20Ayd%C4%B1n")).items.every((d: any) => d.owner === "Selin Aydın"), true);
});

test("native MCP: pipeline board and deal detail share one view", async () => {
  const { rpc } = await fixture(createApp, "crm");
  const tools = (await rpc("tools/list", {})).result.tools;
  assert.deepEqual(tools.map((t: any) => [t.name, t._meta.ui?.resourceUri ?? null]), [
    ["show_pipeline", "ui://weldall/pipeline"],
    ["get_deal", "ui://weldall/pipeline"],
    ["get_account", null],
    ["search_accounts", null],
  ]);
  const board = (await rpc("tools/call", { name: "show_pipeline", arguments: { owner: "Tobias Lindner" } })).result;
  assert.equal(board.structuredContent.mode, "pipeline");
  assert.ok(board.structuredContent.deals.every((d: any) => d.owner === "Tobias Lindner"));
  const deal = (await rpc("tools/call", { name: "get_deal", arguments: { id: "deal-201" } })).result.structuredContent;
  assert.equal(deal.deal.organizationName, "Papierfabrik Rehwinkel AG");
  assert.equal(deal.activities.length > 0, true);
});

test("English: tools and HTTP return the English dataset, German stays the default", async () => {
  const { get, rpc } = await fixture(createApp, "crm");
  const tools = (await rpc("tools/list", {})).result.tools;
  assert.ok(tools.every((t: any) => t.inputSchema.properties.language));

  const board = (await rpc("tools/call", { name: "show_pipeline", arguments: { language: "en" } })).result;
  assert.equal(board.structuredContent.language, "en");
  assert.match(board.content[0].text, /^Open pipeline €[\d,]+ \(weighted €[\d,]+\) in \d+ deals, as of 28 Oct 2026\./);
  assert.match(board.content[0].text, /deal-201 · Modernisation of PM3 roll drive \(Papierfabrik Rehwinkel AG\) · Negotiation 75% · €480,000 · close 15 Dec 2026/);
  assert.equal(board.structuredContent.stages[0].label, "Qualification");

  const deal = (await rpc("tools/call", { name: "get_deal", arguments: { id: "deal-201", language: "en" } })).result;
  assert.match(deal.content[0].text, /^- 27 Oct 2026 Call: Ute Blum reports/m);
  assert.equal(deal.structuredContent.deal.stageLabel, "Negotiation");
  assert.equal(deal.structuredContent.organization.industry, "Paper and packaging");

  const german = (await rpc("tools/call", { name: "get_deal", arguments: { id: "deal-201" } })).result;
  assert.equal(german.structuredContent.language, "de");
  assert.match(german.content[0].text, /Abschluss 15\.12\.2026/);
  assert.match(german.content[0].text, /^- 27\.10\.2026 call: /m);

  const account = (await rpc("tools/call", { name: "get_account", arguments: { id: "org-500", language: "en" } })).result;
  assert.equal(account.structuredContent.language, "en");
  assert.match(account.structuredContent.activities[0].summary, /Bid deadline 13 Nov 2026/);

  assert.equal((await get("/api/deals/deal-201?lang=en")).item.title, "Modernisation of PM3 roll drive");
  assert.equal((await get("/api/pipeline?lang=en")).stages[2].label, "Proposal");
  assert.equal((await get("/api/pipeline")).stages[2].label, "Angebot");
  assert.equal((await get("/api/organizations/org-200?lang=xx")).item.industry, "Papier und Verpackung");
});
