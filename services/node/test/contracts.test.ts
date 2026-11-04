import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../src/contracts/app.js";
import { publicOrigin } from "../src/shared/config.js";
import { fixture } from "./helpers.js";

test("health and metadata are public; records need a valid, unreplayed proof", async () => {
  const { app, origin, request } = await fixture(createApp, "contracts");
  assert.equal((await app.fetch(new Request("http://internal/health"))).status, 200);
  const resource = await (await app.fetch(new Request("http://internal/.well-known/oauth-protected-resource"))).json();
  assert.equal(resource.weldall_skills_endpoint, `${origin}/.well-known/weldall-skills`);
  assert.equal(resource.weldall_mcp.endpoint, `${origin}/api/mcp`);
  assert.equal((await app.fetch(new Request("http://internal/api/contracts"))).status, 401);
  assert.equal((await app.fetch(await request("/api/contracts", { scopes: ["other:read"] }))).status, 401);
  assert.equal((await app.fetch(await request("/api/contracts", { proofOrigin: "https://attacker.example" }))).status, 401);
  const once = await request("/api/contracts");
  const again = once.clone();
  assert.equal((await app.fetch(once)).status, 200);
  assert.equal((await app.fetch(again)).status, 401);
});

test("deadlines: notice, missed notice with renewal, options and filters", async () => {
  const { get } = await fixture(createApp, "contracts");
  const all = (await get("/api/contracts")).items;
  assert.equal(all.length, 18);
  const byId = Object.fromEntries(all.map((c: any) => [c.id, c]));
  assert.equal(byId["ctr-1005"].noticeDeadline, "2026-10-31");
  assert.equal(byId["ctr-1005"].urgency, "critical");
  assert.equal(byId["ctr-1001"].urgency, "missed");
  assert.equal(byId["ctr-1001"].renewedUntil, "2027-12-31");
  assert.equal(byId["ctr-2003"].noticeDeadline, "2026-11-19");
  assert.equal(byId["ctr-1008"].nextDeadline.label, "Übernahmeoption ausüben");
  assert.equal(all[0].id, "ctr-1005", "sorted by the next deadline");
  const yearEnd = (await get("/api/contracts?status=active&endsBefore=2026-12-31")).items.map((c: any) => c.id);
  assert.deepEqual(yearEnd.sort(), ["ctr-1001", "ctr-1005", "ctr-1008", "ctr-2001", "ctr-2003", "ctr-2005"]);
  assert.equal((await get("/api/contracts?customerId=org-200")).total, 2);
  assert.equal((await get("/api/contracts?direction=supplier")).total, 5);
  assert.equal((await get("/api/contracts/ctr-1003/clauses")).items[2].heading, "Reaktions- und Wiederherstellungszeiten");
});

test("dates move by whole days, so the story is the same on any day and at any hour", async () => {
  const anchor = (await (await fixture(createApp, "contracts")).get("/api/contracts/ctr-1005")).item;
  const { get } = await fixture(createApp, "contracts", new Date("2027-02-10T16:30:00Z"));
  const c = (await get("/api/contracts/ctr-1005")).item;
  assert.equal(c.endsOn, "2027-03-15");
  assert.equal(c.noticeDeadline, "2027-02-13");
  assert.deepEqual([c.urgency, c.nextDeadline.days], [anchor.urgency, anchor.nextDeadline.days]);
  assert.match(c.situation, /13\.02\.2027/);
  assert.match(c.clauses.find((x: any) => x.heading === "Laufzeit und Kündigung").text, /15\.03\.2027/);
});

test("native MCP: tools open the view, the view is a sanitized shell with own-origin assets", async () => {
  const { rpc, origin, app } = await fixture(createApp, "contracts");
  const tools = (await rpc("tools/list", {})).result.tools;
  assert.deepEqual(tools.map((t: any) => t.name), ["list_contracts", "get_contract"]);
  for (const tool of tools) assert.equal(tool._meta.ui.resourceUri, "ui://weldall/contracts");
  const resources = (await rpc("resources/list", {})).result.resources;
  assert.deepEqual(resources[0]._meta.ui.allowedTools, ["get_contract", "list_contracts"]);
  const view = (await rpc("resources/read", { uri: "ui://weldall/contracts" })).result.contents[0];
  assert.equal(view.mimeType, "text/html;profile=mcp-app");
  assert.deepEqual(view._meta.ui.csp, { resourceDomains: [origin], connectDomains: [] });
  assert.match(view.text, /connect-src 'none'|connect-src &#39;none&#39;/);
  assert.equal(view.text.includes("Kornfeld"), false, "the shell carries no records");
  const script = view.text.match(/\/mcp-ui\/contracts\.js\?v=[0-9a-f]{16}/)[0];
  const asset = await app.fetch(new Request(`http://internal${script}`));
  assert.equal(asset.headers.get("access-control-allow-origin"), "*");
  const listed = (await rpc("tools/call", { name: "list_contracts", arguments: { deadlineWithinDays: 30 } })).result;
  assert.equal(listed.structuredContent.mode, "portfolio");
  assert.deepEqual(listed.structuredContent.items.map((c: any) => c.id), ["ctr-1005", "ctr-2002", "ctr-2003"]);
  const missing = (await rpc("tools/call", { name: "get_contract", arguments: { id: "ctr-9999" } })).result;
  assert.equal(missing.isError, true);
});

test("skills are German, scoped and free of demo framing; writes are refused", async () => {
  const { app, request } = await fixture(createApp, "contracts");
  const response = await app.fetch(await request("/api/contracts/ctr-1001", { method: "DELETE" }));
  assert.equal(response.status, 405);
  assert.equal((await response.json()).changed, false);
  const { contractSkills } = await import("../src/contracts/skills.js");
  const skills = contractSkills("https://contracts.example.com");
  assert.equal(skills[0]?.title, "Welche Verträge laufen bis Jahresende aus?");
  for (const skill of skills) assert.deepEqual(skill.requiredScopes, ["contracts:read"]);
  const published = JSON.stringify(skills);
  for (const tell of ["demo", "Demo", "fictional", "Beispieldaten", "mock", "synthetic"])
    assert.equal(published.includes(tell), false, `skill catalog leaks "${tell}"`);
});

test("only HTTPS origins accepted", () => {
  for (const value of ["http://example.com", "https://a.example/", "https://a.example/path"])
    assert.throws(() => publicOrigin(value));
});

test("English: tools and HTTP return English records and text; German stays the default", async () => {
  const { get, rpc } = await fixture(createApp, "contracts");
  const listed = (await rpc("tools/call", { name: "list_contracts", arguments: { deadlineWithinDays: 30, language: "en" } })).result;
  assert.equal(listed.structuredContent.language, "en");
  assert.deepEqual(listed.structuredContent.filter, { deadlineWithinDays: 30 });
  assert.deepEqual(listed.structuredContent.items.map((c: any) => c.id), ["ctr-1005", "ctr-2002", "ctr-2003"]);
  const text = listed.content[0].text;
  assert.match(text, /^3 contracts as of 28 Oct 2026:/);
  assert.match(text, /ctr-1005 · V-2021-008 · Maintenance contract for milling and conveying plant .* ends 30 Nov 2026 · €21,600 annual · Notice possible until 31 Oct 2026, otherwise the contract renews for 12 months\./);
  const ctr1005 = listed.structuredContent.items[0];
  assert.equal(ctr1005.nextDeadline.label, "Notice deadline");

  const dossier = (await rpc("tools/call", { name: "get_contract", arguments: { id: "ctr-1001", language: "en" } })).result;
  assert.equal(dossier.structuredContent.language, "en");
  assert.match(dossier.structuredContent.item.situation, /^Notice deadline of 30 Sept? 2026 has passed\. The contract renews automatically until 31 Dec 2027\.$/);
  const missing = (await rpc("tools/call", { name: "get_contract", arguments: { id: "ctr-9999", language: "en" } })).result;
  assert.equal(missing.content[0].text, "There is no contract with the ID ctr-9999.");

  const german = (await rpc("tools/call", { name: "list_contracts", arguments: { deadlineWithinDays: 30 } })).result;
  assert.equal(german.structuredContent.language, "de");
  assert.match(german.content[0].text, /^3 Verträge, Stand 28\.10\.2026:/);
  assert.match(german.content[0].text, /Ende 30\.11\.2026 · 21\.600\s€ jährlich · Kündigung bis 31\.10\.2026/);

  const http = await get("/api/contracts/ctr-1008?lang=en");
  assert.equal(http.item.nextDeadline.label, "Exercise conversion option");
  assert.equal(http.item.valueBasis, "one-off");
  assert.equal((await get("/api/contracts/ctr-1008")).item.nextDeadline.label, "Übernahmeoption ausüben");
  assert.equal((await get("/api/contracts?lang=en&direction=supplier")).total, 5);
});
