import type { ReplayStore } from "@weldall/sdk";
import { createNativeMcp } from "@weldall/sdk/mcp/server";
import type { ServiceConfig } from "../shared/config.js";
import { daysBetween, demoNow, germanDate, isoDay, shifted } from "../shared/dates.js";
import { createService, includes, notFound } from "../shared/service.js";
import { toolError, toolResult, viewAssets } from "../shared/ui.js";
import { ACTIVITIES, CONTACTS, DEALS, ORGANIZATIONS, STAGES, TEAM } from "./data.js";
import { crmSkills } from "./skills.js";

const SCOPE = "crm:read";
const OPEN = new Set(["qualifizierung", "bedarfsanalyse", "angebot", "verhandlung"]);
const money = (value: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

export function createApp(
  config: ServiceConfig,
  replay: ReplayStore,
  ping: () => Promise<unknown>,
  now: () => Date = () => new Date(),
) {
  const data = shifted({ organizations: ORGANIZATIONS, contacts: CONTACTS, activities: ACTIVITIES, deals: DEALS }, now);
  const today = () => isoDay(demoNow(now()));
  const org = (id: string) => data().organizations.find((o) => o.id === id);
  const contact = (id: string | null) => (id ? data().contacts.find((p) => p.id === id) ?? null : null);
  const history = (organizationId: string) =>
    data().activities.filter((a) => a.organizationId === organizationId).sort((a, b) => b.date.localeCompare(a.date));

  const deal = (d: (typeof DEALS)[number]) => {
    const stage = STAGES.find((s) => s.id === d.stage)!;
    const open = OPEN.has(d.stage);
    const organization = org(d.organizationId)!;
    return {
      ...d,
      stageLabel: stage.label,
      probability: stage.probability,
      weightedValue: Math.round((d.value * stage.probability) / 100),
      open,
      organizationName: organization.name,
      contact: contact(d.contactId),
      daysToClose: daysBetween(today(), d.closeDate),
      overdue: open && d.closeDate < today(),
      daysSinceActivity: daysBetween(d.lastActivity, today()),
    };
  };
  const deals = (filter: { stage?: string; owner?: string; organizationId?: string }) =>
    data()
      .deals.map(deal)
      .filter(
        (d) =>
          (!filter.stage || d.stage === filter.stage) &&
          (!filter.owner || d.owner === filter.owner) &&
          (!filter.organizationId || d.organizationId === filter.organizationId),
      )
      .sort((a, b) => a.closeDate.localeCompare(b.closeDate));

  const pipeline = (filter: { owner?: string; organizationId?: string }) => {
    const items = deals(filter);
    const open = items.filter((d) => d.open);
    const quarterEnd = (() => {
      const date = new Date(`${today()}T00:00:00Z`);
      return isoDay(new Date(Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3 + 3, 0)));
    })();
    return {
      mode: "pipeline",
      today: today(),
      filter,
      team: TEAM,
      stages: STAGES.map((s) => {
        const inStage = items.filter((d) => d.stage === s.id);
        return { ...s, count: inStage.length, value: inStage.reduce((sum, d) => sum + d.value, 0) };
      }),
      totals: {
        open: open.reduce((sum, d) => sum + d.value, 0),
        weighted: open.reduce((sum, d) => sum + d.weightedValue, 0),
        openCount: open.length,
        closingThisQuarter: open.filter((d) => d.closeDate <= quarterEnd).reduce((sum, d) => sum + d.value, 0),
        quarterEnd,
        wonThisYear: items
          .filter((d) => d.stage === "gewonnen" && d.closeDate.slice(0, 4) === today().slice(0, 4))
          .reduce((sum, d) => sum + d.value, 0),
        attention: open.filter((d) => d.overdue || d.daysToClose <= 14 || d.daysSinceActivity > 30).length,
      },
      deals: items,
    };
  };

  const briefing = (id: string) => {
    const organization = org(id);
    if (!organization) return null;
    return {
      organization,
      contacts: data().contacts.filter((p) => p.organizationId === id),
      activities: history(id),
      deals: deals({ organizationId: id }),
    };
  };

  const assets = viewAssets(config.origin, "pipeline");
  const view = assets.view({
    title: "Vertriebspipeline",
    scopes: [SCOPE],
    allowedTools: ["get_deal", "show_pipeline"],
    fallback: "Die Pipeline wird geladen. Zeigt dieser Client keine interaktiven Ansichten, steht dieselbe Übersicht als Text im Chat.",
  });
  const owners = TEAM.filter((t) => t.role.startsWith("Key Account")).map((t) => t.name);

  const mcp = createNativeMcp({
    path: "/api/mcp",
    description:
      "CRM der Brakenstedt Antriebstechnik: Kunden und Interessenten, Ansprechpartner, Kontaktverlauf und Vertriebspipeline mit Verkaufschancen. Für Fragen wie „Wie steht die Pipeline?“ oder „Bereite mich auf den Termin mit Rehwinkel vor“.",
    discoveryScopes: [SCOPE],
    resources: [view],
    tools: [
      {
        name: "show_pipeline",
        title: "Vertriebspipeline",
        description:
          "Vertriebspipeline nach Phase (Qualifizierung bis Gewonnen/Verloren) mit Wert, Wahrscheinlichkeit, gewichtetem Wert, Abschlussdatum, nächstem Schritt und Hinweisen auf überfällige oder liegengebliebene Chancen. Optional für eine verantwortliche Person oder einen Kunden. Clients mit MCP-App-Unterstützung zeigen ein Pipeline-Board; dann nicht jede Chance aufzählen, sondern die Lage einordnen.",
        inputSchema: {
          type: "object",
          properties: {
            owner: { enum: owners, description: "Verantwortliche Key-Account-Managerin oder -Manager." },
            organizationId: { type: "string", pattern: "^org-\\d+$", description: "Nur Chancen dieses Kunden, z. B. org-200." },
          },
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: view.uri } },
        async handler(args) {
          const result = pipeline(args as { owner?: string; organizationId?: string });
          const lines = result.deals.map(
            (d) => `- ${d.id} · ${d.title} (${d.organizationName}) · ${d.stageLabel} ${d.probability} % · ${money(d.value)} · Abschluss ${germanDate(d.closeDate)}${d.overdue ? " (überfällig)" : ""} · ${d.owner} · Nächster Schritt: ${d.nextStep}`,
          );
          return toolResult(
            [
              `Offene Pipeline ${money(result.totals.open)} (gewichtet ${money(result.totals.weighted)}) in ${result.totals.openCount} Chancen, Stand ${germanDate(result.today)}.`,
              ...lines,
            ].join("\n"),
            result,
          );
        },
      },
      {
        name: "get_deal",
        title: "Verkaufschance",
        description: "Eine Verkaufschance mit Kunde, Ansprechpartner, nächstem Schritt und dem Kontaktverlauf des Kunden.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string", pattern: "^deal-\\d+$", description: "ID aus show_pipeline, z. B. deal-201." } },
          required: ["id"],
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: view.uri } },
        async handler(args) {
          const item = data().deals.find((d) => d.id === args.id);
          if (!item) return toolError(`Es gibt keine Verkaufschance mit der ID ${String(args.id)}.`);
          const enriched = deal(item);
          const activities = history(item.organizationId).slice(0, 6);
          return toolResult(
            [
              `${enriched.title} (${enriched.organizationName}) · ${enriched.stageLabel} · ${money(enriched.value)} · Abschluss ${germanDate(enriched.closeDate)} · ${enriched.owner}`,
              `Nächster Schritt: ${enriched.nextStep}`,
              ...activities.map((a) => `- ${germanDate(a.date)} ${a.type}: ${a.summary}`),
            ].join("\n"),
            { mode: "deal", today: today(), deal: enriched, organization: org(item.organizationId), activities },
          );
        },
      },
      {
        name: "get_account",
        title: "Kundenbriefing",
        description: "Alles zu einem Kunden: Stammdaten, Ansprechpartner, Kontaktverlauf (neueste zuerst), Verkaufschancen und IDs der Verträge im Vertragsregister.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string", pattern: "^org-\\d+$", description: "Organisations-ID, z. B. org-200. Unbekannt? Erst search_accounts." } },
          required: ["id"],
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        async handler(args) {
          const result = briefing(String(args.id));
          if (!result) return toolError(`Es gibt keinen Kunden mit der ID ${String(args.id)}.`);
          return toolResult(JSON.stringify(result), result);
        },
      },
      {
        name: "search_accounts",
        title: "Kunden suchen",
        description: "Sucht Kunden, Interessenten und Ansprechpartner nach Namen. Liefert Organisations-IDs für get_account und show_pipeline.",
        inputSchema: {
          type: "object",
          properties: { q: { type: "string", minLength: 2, maxLength: 100 } },
          required: ["q"],
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        async handler(args) {
          const q = String(args.q);
          const organizations = data().organizations.filter((o) => includes([o.name, o.city], q));
          const people = data().contacts.filter((p) => includes([p.name], q));
          const result = { organizations, contacts: people };
          return toolResult(JSON.stringify(result), result);
        },
      },
    ],
  });

  const service = createService({ key: "crm", name: "CRM", scope: SCOPE, config, replay, ping, skills: crmSkills(config.origin), mcp });
  const { app, read, readOnly } = service;
  assets.register(app);
  app.get("/api/organizations", read, (c) => {
    const status = c.req.query("status");
    const items = data().organizations.filter((o) => includes([o.name, o.city], c.req.query("q")) && (!status || o.status === status));
    return c.json({ items, total: items.length });
  });
  app.get("/api/organizations/:id", read, (c) => {
    const item = org(c.req.param("id"));
    return item ? c.json({ item }) : c.json(notFound, 404);
  });
  app.get("/api/organizations/:id/contacts", read, (c) =>
    org(c.req.param("id"))
      ? c.json({ items: data().contacts.filter((p) => p.organizationId === c.req.param("id")) })
      : c.json(notFound, 404),
  );
  app.get("/api/organizations/:id/activities", read, (c) =>
    org(c.req.param("id")) ? c.json({ items: history(c.req.param("id")) }) : c.json(notFound, 404),
  );
  app.get("/api/organizations/:id/briefing", read, (c) => {
    const result = briefing(c.req.param("id"));
    return result ? c.json(result) : c.json(notFound, 404);
  });
  app.get("/api/contacts", read, (c) => {
    const items = data().contacts.filter((p) => includes([p.name], c.req.query("q")));
    return c.json({ items, total: items.length });
  });
  app.get("/api/contacts/:id", read, (c) => {
    const item = contact(c.req.param("id"));
    return item ? c.json({ item }) : c.json(notFound, 404);
  });
  app.get("/api/deals", read, (c) => {
    const items = deals({ stage: c.req.query("stage"), owner: c.req.query("owner"), organizationId: c.req.query("organizationId") });
    return c.json({ items, total: items.length });
  });
  app.get("/api/deals/:id", read, (c) => {
    const item = data().deals.find((d) => d.id === c.req.param("id"));
    return item ? c.json({ item: deal(item) }) : c.json(notFound, 404);
  });
  app.get("/api/pipeline", read, (c) => c.json(pipeline({ owner: c.req.query("owner") })));
  readOnly("/api/organizations/:id");
  readOnly("/api/contacts/:id");
  readOnly("/api/deals/:id");
  return service;
}
