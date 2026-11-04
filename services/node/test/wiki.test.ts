import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../src/wiki/app.js";
import { fixture } from "./helpers.js";

test("wiki search returns excerpts, pages return Markdown, writes are refused", async () => {
  const { app, get, request } = await fixture(createApp, "wiki");
  assert.equal((await get("/api/spaces")).items.length, 4);
  const hits = (await get("/api/pages?q=gutschrift")).items;
  assert.deepEqual(hits.map((p: any) => p.id), ["page-101"]);
  assert.equal(hits[0].body, undefined);
  assert.match((await get("/api/pages/page-102")).item.body, /\| Kunde \|/);
  assert.equal((await app.fetch(await request("/api/pages/page-101", { method: "DELETE" }))).status, 405);
  assert.equal((await app.fetch(await request("/api/mcp", { method: "POST", body: {} }))).status, 404, "no native MCP");
});

test("wiki answers in English with ?lang=en, German stays the default", async () => {
  const { get } = await fixture(createApp, "wiki");
  const spaces = (await get("/api/spaces?lang=en")).items;
  assert.equal(spaces.find((s: any) => s.key === "SVC").name, "Customer Service");
  assert.equal(spaces.find((s: any) => s.key === "SVC").pages, (await get("/api/spaces")).items.find((s: any) => s.key === "SVC").pages);
  const hits = (await get("/api/pages?space=svc&q=service%20credits&lang=en")).items;
  assert.deepEqual(hits.map((p: any) => p.id), ["page-101"]);
  assert.equal(hits[0].title, "Escalation process for breakdowns");
  assert.match((await get("/api/pages/page-101?lang=en")).item.body, /## Service credits/);
  assert.equal((await get("/api/pages/page-101")).item.title, (await import("../src/wiki/data.js")).PAGES[0]!.title);
  assert.equal((await get("/api/pages/page-101?lang=fr")).item.title, (await import("../src/wiki/data.js")).PAGES[0]!.title);
});
