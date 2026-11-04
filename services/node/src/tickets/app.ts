import type { ReplayStore } from "@weldall/sdk";
import { createNativeMcp } from "@weldall/sdk/mcp/server";
import type { ServiceConfig } from "../shared/config.js";
import { demoNow, shifted } from "../shared/dates.js";
import { type Lang, LANGUAGE, langOf, langQuery, tr } from "../shared/lang.js";
import { createService, includes, notFound } from "../shared/service.js";
import { toolError, toolResult, viewAssets } from "../shared/ui.js";
import * as DE from "./data.js";
import type { Ticket } from "./data.js";
import * as EN from "./data.en.js";
import { ticketSkills } from "./skills.js";

const SCOPE = "tickets:read";
const PRIORITY = ["Kritisch", "Hoch", "Mittel", "Niedrig"];
const STATUS = ["Offen", "In Arbeit", "Wartet auf Kunde", "Geplant", "Erledigt"];

// Type, status and priority stay German codes in both datasets (filters and sorting use them); English text shows these labels.
const LABEL: Record<string, string> = {
  Kritisch: "Critical",
  Hoch: "High",
  Mittel: "Medium",
  Niedrig: "Low",
  Offen: "Open",
  "In Arbeit": "In progress",
  "Wartet auf Kunde": "Waiting for customer",
  Geplant: "Scheduled",
  Erledigt: "Done",
  Störung: "Incident",
  Wartung: "Maintenance",
  Serviceanfrage: "Service request",
  Reklamation: "Complaint",
  "IT-Anfrage": "IT request",
};
const label = (code: string, lang: Lang) => (lang === "en" ? (LABEL[code] ?? code) : code);

const time = (iso: string, lang: Lang = "de") =>
  new Intl.DateTimeFormat(
    lang === "en" ? "en-GB" : "de-DE",
    lang === "en"
      ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }
      : { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" },
  ).format(new Date(iso));

/** SLA state at `now`: the next SLA clock that is still running. */
export function slaState(ticket: Ticket, now: Date, lang: Lang = "de") {
  // Waiting for the customer pauses the clock, as SLA definitions usually say.
  if (!ticket.sla || ticket.status === "Erledigt" || ticket.status === "Wartet auf Kunde") return null;
  const respond = !ticket.sla.respondedAt;
  const due = respond ? ticket.sla.respondBy : ticket.sla.resolveBy;
  if (!due) return null;
  const minutesLeft = Math.round((Date.parse(due) - now.getTime()) / 60000);
  return {
    clock: respond ? tr(lang, "Reaktion", "Response") : tr(lang, "Wiederherstellung", "Restoration"),
    due,
    minutesLeft,
    state: minutesLeft < 0 ? "breached" : minutesLeft <= 240 ? "due-soon" : "running",
  };
}

type Filter = { status?: string; open?: boolean; customerId?: string; assignee?: string; priority?: string; q?: string };

export function createApp(
  config: ServiceConfig,
  replay: ReplayStore,
  ping: () => Promise<unknown>,
  now: () => Date = () => new Date(),
) {
  const data = { de: shifted(DE.TICKETS, now, "de"), en: shifted(EN.TICKETS, now, "en") };
  const team = { de: DE.TEAM, en: EN.TEAM };
  const enrich = (t: Ticket, lang: Lang) => ({ ...t, slaState: slaState(t, demoNow(now()), lang) });
  const find = (key: string, lang: Lang) => data[lang]().find((t) => t.key === key.toUpperCase());
  const select = (f: Filter, lang: Lang) =>
    data[lang]()
      .filter(
        (t) =>
          (!f.status || t.status === f.status) &&
          (f.open === undefined || (t.status !== "Erledigt") === f.open) &&
          (!f.customerId || t.customerId === f.customerId) &&
          (!f.assignee || t.assignee === f.assignee) &&
          (!f.priority || t.priority === f.priority) &&
          includes([t.key, t.summary, t.description, t.customer, t.asset, ...t.labels], f.q),
      )
      .map((t) => enrich(t, lang))
      .sort(
        (a, b) =>
          Number(a.status === "Erledigt") - Number(b.status === "Erledigt") ||
          PRIORITY.indexOf(a.priority) - PRIORITY.indexOf(b.priority) ||
          b.updated.localeCompare(a.updated),
      );

  const assets = viewAssets(config.origin, "tickets");
  const view = assets.view({
    title: "Service-Tickets",
    scopes: [SCOPE],
    allowedTools: ["get_ticket", "list_tickets"],
    fallback: "Die Ticketansicht wird geladen. Zeigt dieser Client keine interaktiven Ansichten, steht dasselbe als Text im Chat.",
  });
  // The demo clock stands at the anchor's time of day (see shared/dates.ts). The text says so, so a model that
  // knows the real time does not count the SLA again and call every deadline overdue.
  const asOf = (lang: Lang) => {
    const at = time(demoNow(now()).toISOString(), lang);
    return tr(lang, `Stand ${at} Uhr. SLA-Fristen gelten zu diesem Stand.`, `As of ${at}. SLA deadlines apply as of this time.`);
  };
  const sla = (s: NonNullable<ReturnType<typeof slaState>>, lang: Lang) =>
    lang === "en"
      ? ` · ${s.clock} SLA ${s.minutesLeft < 0 ? "breached" : `due ${time(s.due, lang)}`}`
      : ` · SLA ${s.clock} ${s.minutesLeft < 0 ? "überschritten" : `bis ${time(s.due)}`}`;
  const line = (t: ReturnType<typeof enrich>, lang: Lang) =>
    `- ${t.key} · ${label(t.priority, lang)} · ${label(t.status, lang)} · ${t.summary}${t.customer ? ` (${t.customer})` : ""} · ${
      t.assignee ?? tr(lang, "nicht zugewiesen", "unassigned")
    }${t.slaState ? sla(t.slaState, lang) : ""}`;

  const mcp = createNativeMcp({
    path: "/api/mcp",
    description:
      "Ticketsystem von Kundenservice (SVC) und IT der Brakenstedt Antriebstechnik: Störungen, Wartungen, Reklamationen und Anfragen mit Status, Priorität, SLA, Einsatzterminen und Verlauf. Für Fragen wie „Welche Störungen sind gerade kritisch?“.",
    discoveryScopes: [SCOPE],
    resources: [view],
    tools: [
      {
        name: "list_tickets",
        title: "Tickets",
        description:
          "Listet Tickets, offene zuerst, nach Priorität. Mit SLA-Lage (Reaktion oder Wiederherstellung, Restzeit, überschritten) zum Stand im Ergebnis; nicht mit der eigenen Uhrzeit nachrechnen. Filter: open, status, priority, customerId (CRM-ID), assignee, q. Clients mit MCP-App-Unterstützung zeigen Ticketkarten; dann nicht alles wiederholen, sondern die Lage einordnen.",
        inputSchema: {
          type: "object",
          properties: {
            open: { type: "boolean", description: "true: nur offene Tickets, false: nur erledigte." },
            status: { enum: STATUS, description: "German codes in every language: Offen, In Arbeit, Wartet auf Kunde, Geplant, Erledigt." },
            priority: { enum: PRIORITY, description: "German codes in every language: Kritisch, Hoch, Mittel, Niedrig." },
            customerId: { type: "string", pattern: "^org-\\d+$" },
            assignee: { enum: DE.TEAM.map((t) => t.name) },
            q: { type: "string", maxLength: 100, description: "Suche in Schlüssel, Titel, Beschreibung, Kunde, Anlage, Labels." },
            language: LANGUAGE,
          },
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: view.uri } },
        async handler(args) {
          const { language, ...filter } = args as Filter & { language?: string };
          const lang = langOf(language);
          const items = select(filter, lang);
          return toolResult([asOf(lang), `${items.length} ${tr(lang, "Tickets", "tickets")}:`, ...items.map((t) => line(t, lang))].join("\n"), {
            mode: "list",
            language: lang,
            now: demoNow(now()).toISOString(),
            filter,
            items,
          });
        },
      },
      {
        name: "get_ticket",
        title: "Ticket",
        description:
          "Ein Ticket mit Beschreibung, Anlage, Vertrag, SLA, Einsatztermin und vollständigem Verlauf (Kommentare, Statuswechsel, Zuweisungen; interne Notizen markiert). SLA zum Stand im Ergebnis; nicht mit der eigenen Uhrzeit nachrechnen. Clients mit MCP-App-Unterstützung zeigen eine Ticketkarte.",
        inputSchema: {
          type: "object",
          properties: { key: { type: "string", pattern: "^(SVC|IT|svc|it)-\\d+$", description: "Ticketschlüssel, z. B. SVC-1042." }, language: LANGUAGE },
          required: ["key"],
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: view.uri } },
        async handler(args) {
          const lang = langOf(args.language);
          const ticket = find(String(args.key), lang);
          if (!ticket) return toolError(tr(lang, `Es gibt kein Ticket ${String(args.key)}.`, `There is no ticket ${String(args.key)}.`));
          const item = enrich(ticket, lang);
          const change = (e: (typeof item.history)[number]) =>
            e.kind === "comment"
              ? `${e.internal ? tr(lang, "[intern] ", "[internal] ") : ""}${e.text}`
              : e.kind === "status"
                ? `Status ${label(e.from, lang)} → ${label(e.to, lang)}`
                : e.kind === "assign"
                  ? `${tr(lang, "zugewiesen an", "assigned to")} ${e.to}`
                  : tr(lang, "erstellt", "created");
          const history = item.history.map((e) => `- ${time(e.at, lang)} ${e.author}: ${change(e)}`);
          return toolResult([asOf(lang), line(item, lang), item.description, ...history].join("\n"), {
            mode: "ticket",
            language: lang,
            now: demoNow(now()).toISOString(),
            item,
          });
        },
      },
    ],
  });

  const service = createService({ key: "tickets", name: "Ticketsystem", scope: SCOPE, config, replay, ping, skills: ticketSkills(config.origin), mcp });
  const { app, read, readOnly } = service;
  assets.register(app);
  app.get("/api/tickets", read, (c) => {
    const open = c.req.query("open");
    const items = select({
      status: c.req.query("status"),
      priority: c.req.query("priority"),
      customerId: c.req.query("customerId"),
      assignee: c.req.query("assignee"),
      q: c.req.query("q"),
      ...(open === "true" || open === "false" ? { open: open === "true" } : {}),
    }, langQuery(c));
    return c.json({ items, total: items.length });
  });
  app.get("/api/tickets/:key", read, (c) => {
    const lang = langQuery(c);
    const item = find(c.req.param("key"), lang);
    return item ? c.json({ item: enrich(item, lang) }) : c.json(notFound, 404);
  });
  app.get("/api/team", read, (c) => c.json({ items: team[langQuery(c)] }));
  readOnly("/api/tickets/:key");
  return service;
}
