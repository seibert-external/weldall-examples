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
