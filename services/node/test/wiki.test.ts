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
