import type { ReplayStore } from "@weldall/sdk";
import { createNativeMcp } from "@weldall/sdk/mcp/server";
import type { ServiceConfig } from "../shared/config.js";
import { demoNow, shifted } from "../shared/dates.js";
import { createService, includes, notFound } from "../shared/service.js";
import { toolError, toolResult, viewAssets } from "../shared/ui.js";
import { TEAM, TICKETS, type Ticket } from "./data.js";
import { ticketSkills } from "./skills.js";

const SCOPE = "tickets:read";
const PRIORITY = ["Kritisch", "Hoch", "Mittel", "Niedrig"];
const STATUS = ["Offen", "In Arbeit", "Wartet auf Kunde", "Geplant", "Erledigt"];

const time = (iso: string) =>
  new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(iso));

/** SLA state at `now`: the next SLA clock that is still running. */
export function slaState(ticket: Ticket, now: Date) {
  // Waiting for the customer pauses the clock, as SLA definitions usually say.
  if (!ticket.sla || ticket.status === "Erledigt" || ticket.status === "Wartet auf Kunde") return null;
  const respond = !ticket.sla.respondedAt;
  const due = respond ? ticket.sla.respondBy : ticket.sla.resolveBy;
  if (!due) return null;
  const minutesLeft = Math.round((Date.parse(due) - now.getTime()) / 60000);
  return {
    clock: respond ? "Reaktion" : "Wiederherstellung",
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
  const data = shifted(TICKETS, now);
  const enrich = (t: Ticket) => ({ ...t, slaState: slaState(t, demoNow(now())) });
  const find = (key: string) => data().find((t) => t.key === key.toUpperCase());
  const select = (f: Filter) =>
    data()
      .filter(
        (t) =>
          (!f.status || t.status === f.status) &&
          (f.open === undefined || (t.status !== "Erledigt") === f.open) &&
          (!f.customerId || t.customerId === f.customerId) &&
          (!f.assignee || t.assignee === f.assignee) &&
          (!f.priority || t.priority === f.priority) &&
          includes([t.key, t.summary, t.description, t.customer, t.asset, ...t.labels], f.q),
      )
      .map(enrich)
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
  const asOf = () => `Stand ${time(demoNow(now()).toISOString())} Uhr. SLA-Fristen gelten zu diesem Stand.`;
  const line = (t: ReturnType<typeof enrich>) =>
    `- ${t.key} · ${t.priority} · ${t.status} · ${t.summary}${t.customer ? ` (${t.customer})` : ""} · ${t.assignee ?? "nicht zugewiesen"}${
      t.slaState ? ` · SLA ${t.slaState.clock} ${t.slaState.minutesLeft < 0 ? "überschritten" : `bis ${time(t.slaState.due)}`}` : ""
    }`;

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
            status: { enum: STATUS },
            priority: { enum: PRIORITY },
            customerId: { type: "string", pattern: "^org-\\d+$" },
            assignee: { enum: TEAM.map((t) => t.name) },
            q: { type: "string", maxLength: 100, description: "Suche in Schlüssel, Titel, Beschreibung, Kunde, Anlage, Labels." },
          },
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: view.uri } },
        async handler(args) {
          const filter = args as Filter;
          const items = select(filter);
          return toolResult([asOf(), `${items.length} Tickets:`, ...items.map(line)].join("\n"), {
            mode: "list",
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
          properties: { key: { type: "string", pattern: "^(SVC|IT|svc|it)-\\d+$", description: "Ticketschlüssel, z. B. SVC-1042." } },
          required: ["key"],
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: view.uri } },
        async handler(args) {
          const ticket = find(String(args.key));
          if (!ticket) return toolError(`Es gibt kein Ticket ${String(args.key)}.`);
          const item = enrich(ticket);
          const history = item.history.map(
            (e) =>
              `- ${time(e.at)} ${e.author}: ${
                e.kind === "comment" ? `${e.internal ? "[intern] " : ""}${e.text}` : e.kind === "status" ? `Status ${e.from} → ${e.to}` : e.kind === "assign" ? `zugewiesen an ${e.to}` : "erstellt"
              }`,
          );
          return toolResult([asOf(), line(item), item.description, ...history].join("\n"), {
            mode: "ticket",
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
    });
    return c.json({ items, total: items.length });
  });
  app.get("/api/tickets/:key", read, (c) => {
    const item = find(c.req.param("key"));
    return item ? c.json({ item: enrich(item) }) : c.json(notFound, 404);
  });
  app.get("/api/team", read, (c) => c.json({ items: TEAM }));
  readOnly("/api/tickets/:key");
  return service;
}
