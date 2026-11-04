import type { ReplayStore } from "@weldall/sdk";
import { createNativeMcp } from "@weldall/sdk/mcp/server";
import type { ServiceConfig } from "../shared/config.js";
import { daysBetween, demoNow, isoDay, localDate, shifted } from "../shared/dates.js";
import { type Lang, LANGUAGE, langOf, langQuery, money, tr } from "../shared/lang.js";
import { createService, includes, notFound } from "../shared/service.js";
import { toolError, toolResult, viewAssets } from "../shared/ui.js";
import * as DE from "./data.js";
import * as EN from "./data.en.js";
import { crmSkills } from "./skills.js";

const SCOPE = "crm:read";
const OPEN = new Set(["qualifizierung", "bedarfsanalyse", "angebot", "verhandlung"]);
const SOURCES = { de: DE, en: EN };
// Activity types are codes in both datasets; German text keeps showing the code.
const ACTIVITY_EN: Record<string, string> = { call: "Call", meeting: "Meeting", email: "Email", note: "Note" };
const activityType = (type: string, lang: Lang) => (lang === "en" ? ACTIVITY_EN[type] ?? type : type);

export function createApp(
  config: ServiceConfig,
  replay: ReplayStore,
  ping: () => Promise<unknown>,
  now: () => Date = () => new Date(),
) {
  const dataset = (lang: Lang) => {
    const { ORGANIZATIONS, CONTACTS, ACTIVITIES, DEALS } = SOURCES[lang];
    return shifted({ organizations: ORGANIZATIONS, contacts: CONTACTS, activities: ACTIVITIES, deals: DEALS }, now, lang);
  };
  const datasets = { de: dataset("de"), en: dataset("en") };
  const today = () => isoDay(demoNow(now()));
  const org = (id: string, lang: Lang) => datasets[lang]().organizations.find((o) => o.id === id);
  const contact = (id: string | null, lang: Lang) => (id ? datasets[lang]().contacts.find((p) => p.id === id) ?? null : null);
  const history = (organizationId: string, lang: Lang) =>
    datasets[lang]().activities.filter((a) => a.organizationId === organizationId).sort((a, b) => b.date.localeCompare(a.date));

  const deal = (d: (typeof DE.DEALS)[number], lang: Lang) => {
    const stage = SOURCES[lang].STAGES.find((s) => s.id === d.stage)!;
    const open = OPEN.has(d.stage);
    const organization = org(d.organizationId, lang)!;
    return {
      ...d,
      stageLabel: stage.label,
      probability: stage.probability,
      weightedValue: Math.round((d.value * stage.probability) / 100),
      open,
      organizationName: organization.name,
      contact: contact(d.contactId, lang),
      daysToClose: daysBetween(today(), d.closeDate),
      overdue: open && d.closeDate < today(),
      daysSinceActivity: daysBetween(d.lastActivity, today()),
    };
  };
  const deals = (filter: { stage?: string; owner?: string; organizationId?: string }, lang: Lang) =>
    datasets[lang]()
      .deals.map((d) => deal(d, lang))
      .filter(
        (d) =>
          (!filter.stage || d.stage === filter.stage) &&
          (!filter.owner || d.owner === filter.owner) &&
          (!filter.organizationId || d.organizationId === filter.organizationId),
      )
      .sort((a, b) => a.closeDate.localeCompare(b.closeDate));

  const pipeline = (filter: { owner?: string; organizationId?: string }, lang: Lang) => {
    const items = deals(filter, lang);
    const open = items.filter((d) => d.open);
    const quarterEnd = (() => {
      const date = new Date(`${today()}T00:00:00Z`);
      return isoDay(new Date(Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3 + 3, 0)));
    })();
    return {
      mode: "pipeline",
      today: today(),
      filter,
      team: SOURCES[lang].TEAM,
      stages: SOURCES[lang].STAGES.map((s) => {
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

  const briefing = (id: string, lang: Lang) => {
    const organization = org(id, lang);
    if (!organization) return null;
    return {
      organization,
      contacts: datasets[lang]().contacts.filter((p) => p.organizationId === id),
      activities: history(id, lang),
      deals: deals({ organizationId: id }, lang),
    };
  };

  const assets = viewAssets(config.origin, "pipeline");
  const view = assets.view({
    title: "Vertriebspipeline",
    scopes: [SCOPE],
    allowedTools: ["get_deal", "show_pipeline"],
    fallback: "Die Pipeline wird geladen. Zeigt dieser Client keine interaktiven Ansichten, steht dieselbe Übersicht als Text im Chat.",
  });
  const owners = DE.TEAM.filter((t) => t.role.startsWith("Key Account")).map((t) => t.name);

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
            language: LANGUAGE,
          },
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: view.uri } },
        async handler(args) {
          const lang = langOf(args.language);
          const { owner, organizationId } = args as { owner?: string; organizationId?: string };
          const result = pipeline({ owner, organizationId }, lang);
          const lines = result.deals.map((d) =>
            tr(
              lang,
              `- ${d.id} · ${d.title} (${d.organizationName}) · ${d.stageLabel} ${d.probability} % · ${money(d.value)} · Abschluss ${localDate(d.closeDate)}${d.overdue ? " (überfällig)" : ""} · ${d.owner} · Nächster Schritt: ${d.nextStep}`,
              `- ${d.id} · ${d.title} (${d.organizationName}) · ${d.stageLabel} ${d.probability}% · ${money(d.value, lang)} · close ${localDate(d.closeDate, lang)}${d.overdue ? " (overdue)" : ""} · ${d.owner} · Next step: ${d.nextStep}`,
            ),
          );
          return toolResult(
            [
              tr(
                lang,
                `Offene Pipeline ${money(result.totals.open)} (gewichtet ${money(result.totals.weighted)}) in ${result.totals.openCount} Chancen, Stand ${localDate(result.today)}.`,
                `Open pipeline ${money(result.totals.open, lang)} (weighted ${money(result.totals.weighted, lang)}) in ${result.totals.openCount} deals, as of ${localDate(result.today, lang)}.`,
              ),
              ...lines,
            ].join("\n"),
            { ...result, language: lang },
          );
        },
      },
      {
        name: "get_deal",
        title: "Verkaufschance",
        description: "Eine Verkaufschance mit Kunde, Ansprechpartner, nächstem Schritt und dem Kontaktverlauf des Kunden.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string", pattern: "^deal-\\d+$", description: "ID aus show_pipeline, z. B. deal-201." }, language: LANGUAGE },
          required: ["id"],
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: view.uri } },
        async handler(args) {
          const lang = langOf(args.language);
          const item = datasets[lang]().deals.find((d) => d.id === args.id);
          if (!item)
            return toolError(tr(lang, `Es gibt keine Verkaufschance mit der ID ${String(args.id)}.`, `There is no deal with the ID ${String(args.id)}.`));
          const enriched = deal(item, lang);
          const activities = history(item.organizationId, lang).slice(0, 6);
          return toolResult(
            [
              `${enriched.title} (${enriched.organizationName}) · ${enriched.stageLabel} · ${money(enriched.value, lang)} · ${tr(lang, "Abschluss", "close")} ${localDate(enriched.closeDate, lang)} · ${enriched.owner}`,
              `${tr(lang, "Nächster Schritt", "Next step")}: ${enriched.nextStep}`,
              ...activities.map((a) => `- ${localDate(a.date, lang)} ${activityType(a.type, lang)}: ${a.summary}`),
            ].join("\n"),
            { mode: "deal", today: today(), deal: enriched, organization: org(item.organizationId, lang), activities, language: lang },
          );
        },
      },
      {
        name: "get_account",
        title: "Kundenbriefing",
        description: "Alles zu einem Kunden: Stammdaten, Ansprechpartner, Kontaktverlauf (neueste zuerst), Verkaufschancen und IDs der Verträge im Vertragsregister.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string", pattern: "^org-\\d+$", description: "Organisations-ID, z. B. org-200. Unbekannt? Erst search_accounts." }, language: LANGUAGE },
          required: ["id"],
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        async handler(args) {
          const lang = langOf(args.language);
          const result = briefing(String(args.id), lang);
          if (!result) return toolError(tr(lang, `Es gibt keinen Kunden mit der ID ${String(args.id)}.`, `There is no customer with the ID ${String(args.id)}.`));
          return toolResult(JSON.stringify(result), { ...result, language: lang });
        },
      },
      {
        name: "search_accounts",
        title: "Kunden suchen",
        description: "Sucht Kunden, Interessenten und Ansprechpartner nach Namen. Liefert Organisations-IDs für get_account und show_pipeline.",
        inputSchema: {
          type: "object",
          properties: { q: { type: "string", minLength: 2, maxLength: 100 }, language: LANGUAGE },
          required: ["q"],
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        async handler(args) {
          const lang = langOf(args.language);
          const q = String(args.q);
          const organizations = datasets[lang]().organizations.filter((o) => includes([o.name, o.city], q));
          const people = datasets[lang]().contacts.filter((p) => includes([p.name], q));
          const result = { organizations, contacts: people };
          return toolResult(JSON.stringify(result), { ...result, language: lang });
        },
      },
    ],
  });

  const service = createService({ key: "crm", name: "CRM", scope: SCOPE, config, replay, ping, skills: crmSkills(config.origin), mcp });
  const { app, read, readOnly } = service;
  assets.register(app);
  // ?lang=en returns the English dataset; anything else the German one.
  app.get("/api/organizations", read, (c) => {
    const status = c.req.query("status");
    const items = datasets[langQuery(c)]().organizations.filter((o) => includes([o.name, o.city], c.req.query("q")) && (!status || o.status === status));
    return c.json({ items, total: items.length });
  });
  app.get("/api/organizations/:id", read, (c) => {
    const item = org(c.req.param("id"), langQuery(c));
    return item ? c.json({ item }) : c.json(notFound, 404);
  });
  app.get("/api/organizations/:id/contacts", read, (c) =>
    org(c.req.param("id"), langQuery(c))
      ? c.json({ items: datasets[langQuery(c)]().contacts.filter((p) => p.organizationId === c.req.param("id")) })
      : c.json(notFound, 404),
  );
  app.get("/api/organizations/:id/activities", read, (c) =>
    org(c.req.param("id"), langQuery(c)) ? c.json({ items: history(c.req.param("id"), langQuery(c)) }) : c.json(notFound, 404),
  );
  app.get("/api/organizations/:id/briefing", read, (c) => {
    const result = briefing(c.req.param("id"), langQuery(c));
    return result ? c.json(result) : c.json(notFound, 404);
  });
  app.get("/api/contacts", read, (c) => {
    const items = datasets[langQuery(c)]().contacts.filter((p) => includes([p.name], c.req.query("q")));
    return c.json({ items, total: items.length });
  });
  app.get("/api/contacts/:id", read, (c) => {
    const item = contact(c.req.param("id"), langQuery(c));
    return item ? c.json({ item }) : c.json(notFound, 404);
  });
  app.get("/api/deals", read, (c) => {
    const items = deals({ stage: c.req.query("stage"), owner: c.req.query("owner"), organizationId: c.req.query("organizationId") }, langQuery(c));
    return c.json({ items, total: items.length });
  });
  app.get("/api/deals/:id", read, (c) => {
    const item = datasets[langQuery(c)]().deals.find((d) => d.id === c.req.param("id"));
    return item ? c.json({ item: deal(item, langQuery(c)) }) : c.json(notFound, 404);
  });
  app.get("/api/pipeline", read, (c) => c.json(pipeline({ owner: c.req.query("owner") }, langQuery(c))));
  readOnly("/api/organizations/:id");
  readOnly("/api/contacts/:id");
  readOnly("/api/deals/:id");
  return service;
}
