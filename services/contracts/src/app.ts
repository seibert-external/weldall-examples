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
          id: "overview",
          title: "Contract portfolio overview",
          requiredScopes: ["contracts:read"],
          visibility: "HIDDEN_IF_UNALLOWED",
          content: `# Contract portfolio overview\nList every contract with weldall request --scope contracts:read '${config.origin}/api/contracts'.\nNarrow the list with ?status=active, ?status=draft, ?status=expired, ?customerId=org-100 or ?q=<text>; q matches the title and the summary.\nThe response carries items and total. Each item has status, startsOn, endsOn, value and currency.\nTotals are only meaningful within one currency: group the items by currency before summing value.\ncustomerId is an organization ID in the CRM API, so every contract can be attributed to an account.\nRead ${config.origin}/api/contracts/{id} for a single contract and ${config.origin}/api/contracts/{id}/clauses for its terms.`,
          meta: { tags: ["contracts", "portfolio"], owner: "Legal Operations" },
        },
        {
          id: "review",
          title: "Review contract terms",
          requiredScopes: ["contracts:read"],
          visibility: "HIDDEN_IF_UNALLOWED",
          content: `# Review contract terms\nFetch the contract with weldall request --scope contracts:read ${config.origin}/api/contracts/{id} and its clauses from ${config.origin}/api/contracts/{id}/clauses.\nSummarise the scope, the term dates, the value and currency, and the obligation that each clause creates.\nClause headings are stable across contracts: Support, Renewal, Service levels, Milestones, Acceptance, Data protection and Evaluation.\nQuote the clause text instead of paraphrasing legal wording, and say plainly when a question is not answered by the contract.\nThis API records contracts; it does not provide legal advice.`,
          meta: { tags: ["contracts", "legal", "review"], owner: "Legal Operations" },
        },
        {
          id: "renewals",
          title: "Upcoming renewals",
          requiredScopes: ["contracts:read"],
          visibility: "HIDDEN_IF_UNALLOWED",
          content: `# Upcoming renewals\nList the contracts that are still running with weldall request --scope contracts:read '${config.origin}/api/contracts?status=active'.\nOrder the results by endsOn and treat that date as the end of the current term.\nRead ${config.origin}/api/contracts/{id}/clauses and use the clause headed Renewal to determine whether the contract renews automatically or needs written agreement.\nReport each upcoming renewal with its account (customerId), term end, value and currency, and the action the renewal clause requires.`,
          meta: { tags: ["contracts", "renewals", "legal"], owner: "Legal Operations" },
        },
        {
          id: "by-account",
          title: "Contracts for one customer",
          requiredScopes: ["contracts:read"],
          visibility: "HIDDEN_IF_UNALLOWED",
          content: `# Contracts for one customer\nResolve the account with weldall request --scope contracts:read '${config.origin}/api/contracts?customerId=org-100'.\ncustomerId is an organization ID in the CRM API, so the same value addresses the account there.\nWhen the caller also holds crm:read, compare the result with the account contractIds to find agreements that are not registered against the account.\nSummarise the running term, the expired agreements and any draft that is not yet signed.`,
          meta: { tags: ["contracts", "accounts"], owner: "Legal Operations" },
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
    return c.json({ items, total: items.length });
  });
  app.get("/api/contracts/:id", (c) => {
    const item = contracts.find((x) => x.id === c.req.param("id"));
    return item
      ? c.json({ item })
      : c.json({ error: "not_found" }, 404);
  });
  app.get("/api/contracts/:id/clauses", (c) => {
    const item = contracts.find((x) => x.id === c.req.param("id"));
    return item
      ? c.json({ items: item.clauses })
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
