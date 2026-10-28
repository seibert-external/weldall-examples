import type { ReplayStore } from "@weldall/sdk";
import type { ServiceConfig } from "../shared/config.js";
import { shifted } from "../shared/dates.js";
import { createService, includes, notFound } from "../shared/service.js";
import { PAGES, SPACES } from "./data.js";
import { wikiSkills } from "./skills.js";

const SCOPE = "wiki:read";

export function createApp(
  config: ServiceConfig,
  replay: ReplayStore,
  ping: () => Promise<unknown>,
  now: () => Date = () => new Date(),
) {
  const pages = shifted(PAGES, now);
  const service = createService({ key: "wiki", name: "Wiki", scope: SCOPE, config, replay, ping, skills: wikiSkills(config.origin) });
  const { app, read, readOnly } = service;
  app.get("/api/spaces", read, (c) =>
    c.json({ items: SPACES.map((s) => ({ ...s, pages: pages().filter((p) => p.space === s.key).length })) }),
  );
  // Search results carry an excerpt, not the whole body.
  app.get("/api/pages", read, (c) => {
    const space = c.req.query("space")?.toUpperCase();
    const q = c.req.query("q");
    const items = pages()
      .filter((p) => (!space || p.space === space) && includes([p.title, p.body, ...p.labels], q))
      .map(({ body, ...page }) => ({ ...page, excerpt: body.replace(/[#*|`-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180) }));
    return c.json({ items, total: items.length });
  });
  app.get("/api/pages/:id", read, (c) => {
    const item = pages().find((p) => p.id === c.req.param("id"));
    return item ? c.json({ item }) : c.json(notFound, 404);
  });
  readOnly("/api/pages/:id");
  return service;
}
