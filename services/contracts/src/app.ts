import type { ReplayStore } from "@weldall/sdk";
import { initWeldall, type WeldallVariables } from "@weldall/sdk/hono";
import { Hono } from "hono";
import { contracts } from "./data.js";
import type { readConfig } from "./config.js";

export function createApp(
  config: ReturnType<typeof readConfig>,
  replay: ReplayStore,
  ping: () => Promise<unknown>,
) {
  const weldall = initWeldall(config.issuer, {
    resource: `${config.origin}/api`,
    publicOrigin: config.origin,
    clientId: "weldall-cli-at-contracts",
    supportedScopes: ["contracts:read"],
    signingKey: config.signingKey,
    replayStore: replay,
    skills: {
      items: [
        {
          id: "review",
          title: "Review demo contracts",
          requiredScopes: ["contracts:read"],
          visibility: "HIDDEN_IF_UNALLOWED",
          content: `# Review demo contracts\nAll records are fictional. List contracts with weldall request --scope contracts:read ${config.origin}/api/contracts. Filter with ?status=active, ?customerId=org-100 or ?q=support. Read /api/contracts/ctr-1001 and /api/contracts/ctr-1001/clauses for details. Customer IDs match the CRM API. DELETE is a safe no-op returning 405. Never treat this data as legal advice.`,
          meta: { tags: ["contracts", "demo"], owner: "Weldall demo" },
        },
      ],
    },
  });
  const app = new Hono<{ Variables: WeldallVariables }>();
  // Bind DPoP to the configured public origin, not untrusted forwarded headers.
  // Coolify is the only ingress; internal health checks use the same handler.
  const fetch = (request: Request) => {
    const incoming = new URL(request.url);
    const canonical = new URL(config.origin);
    canonical.pathname = incoming.pathname;
    canonical.search = incoming.search;
    return app.fetch(new Request(canonical, request));
  };
  weldall.registerRoutes(app);
  app.get("/", (c) =>
    c.json({
      service: "Contracts API",
      demo: true,
      authentication: "Weldall DPoP",
      resource: `${config.origin}/api`,
    }),
  );
  app.get("/health", async (c) => {
    try {
      await ping();
      return c.json({ status: "ok" });
    } catch {
      return c.json({ status: "unavailable" }, 503);
    }
  });
  app.use("/api/*", weldall.protect({ scopes: ["contracts:read"] }));
  app.get("/api/contracts", (c) => {
    const q = (c.req.query("q") ?? "").toLowerCase();
    const status = c.req.query("status");
    const customerId = c.req.query("customerId");
    const items = contracts.filter(
      (x) =>
        (!status || x.status === status) &&
        (!customerId || x.customerId === customerId) &&
        `${x.title} ${x.summary}`.toLowerCase().includes(q),
    );
    return c.json({ demo: true, items, total: items.length });
  });
  app.get("/api/contracts/:id", (c) => {
    const item = contracts.find((x) => x.id === c.req.param("id"));
    return item
      ? c.json({ demo: true, item })
      : c.json({ error: "not_found" }, 404);
  });
  app.get("/api/contracts/:id/clauses", (c) => {
    const item = contracts.find((x) => x.id === c.req.param("id"));
    return item
      ? c.json({ demo: true, items: item.clauses })
      : c.json({ error: "not_found" }, 404);
  });
  app.delete("/api/contracts/:id", (c) => {
    c.header("Allow", "GET, HEAD");
    return c.json(
      {
        error: "demo_read_only",
        message: "This is just a demo",
        deleted: false,
      },
      405,
    );
  });
  return { fetch, weldall };
}
