import type { ReplayStore } from "@weldall/sdk";
import { createNativeMcp } from "@weldall/sdk/mcp/server";
import type { ServiceConfig } from "../shared/config.js";
import { addMonths, ANCHOR, daysBetween, demoNow, germanDate, isoDay, shifted } from "../shared/dates.js";
import { createService, includes, notFound } from "../shared/service.js";
import { toolError, toolResult, viewAssets } from "../shared/ui.js";
import { contracts as raw, type Contract } from "./data.js";
import { contractSkills } from "./skills.js";

const SCOPE = "contracts:read";

export type Deadline = {
  date: string;
  label: string;
  kind: "notice" | "milestone" | "end" | "renewal";
  days: number;
};

/** Derived facts the register does not store: deadlines relative to today. */
export function enrich(contract: Contract, today: string) {
  const { notice, renewal, endsOn } = contract;
  const noticeDeadline = !notice
    ? null
    : notice.weeks
      ? isoDay(new Date(Date.parse(endsOn) - notice.weeks * 7 * 86_400_000))
      : addMonths(endsOn, -(notice.months ?? 0));
  const running = contract.status === "active";
  const missed = running && noticeDeadline !== null && noticeDeadline < today;
  const renewedUntil = missed && renewal.automatic ? addMonths(endsOn, renewal.months ?? 12) : null;
  const deadlines: Deadline[] = [
    ...(noticeDeadline ? [{ date: noticeDeadline, label: "Kündigungsfrist", kind: "notice" as const }] : []),
    ...contract.milestones.map((m) => ({ ...m, kind: "milestone" as const })),
    { date: endsOn, label: renewedUntil ? "Ende der Laufzeit" : "Vertragsende", kind: "end" as const },
    ...(renewedUntil ? [{ date: renewedUntil, label: "Ende der Verlängerung", kind: "renewal" as const }] : []),
  ]
    .map((d) => ({ ...d, days: daysBetween(today, d.date) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const next = running
    ? deadlines.find((d) => d.days >= 0 && !(renewedUntil && d.kind === "end")) ?? null
    : null;
  // A notice period missed in the last four months is worth showing as such.
  const urgency = !running
    ? "none"
    : renewedUntil && daysBetween(noticeDeadline!, today) <= 120
      ? "missed"
      : !next
        ? "none"
        : next.days <= 14 ? "critical" : next.days <= 60 ? "soon" : next.days <= 120 ? "planned" : "later";
  const situation = situationText(contract, today, noticeDeadline, renewedUntil, next);
  return { ...contract, noticeDeadline, renewedUntil, deadlines, nextDeadline: next, urgency, situation };
}

function situationText(
  c: Contract,
  today: string,
  noticeDeadline: string | null,
  renewedUntil: string | null,
  next: Deadline | null,
): string {
  if (c.status === "draft") return `Entwurf, noch nicht unterzeichnet. Geplanter Beginn am [[${c.startsOn}]].`;
  if (c.status === "expired") return `Beendet zum [[${c.endsOn}]].`;
  if (renewedUntil)
    return `Kündigungsfrist am [[${noticeDeadline!}]] verstrichen. Der Vertrag verlängert sich automatisch bis [[${renewedUntil}]].`;
  if (next?.kind === "milestone")
    return `${next.label}: [[${next.date}]] (${next.days === 0 ? "heute" : `in ${next.days} Tagen`}).`;
  if (noticeDeadline && noticeDeadline >= today)
    return c.renewal.automatic
      ? `Kündigung bis [[${noticeDeadline}]] möglich, sonst Verlängerung um ${c.renewal.months} Monate.`
      : `Endet am [[${c.endsOn}]]. Über eine Fortsetzung muss bis [[${noticeDeadline}]] entschieden werden.`;
  return `Endet am [[${c.endsOn}]] ohne Verlängerung. Ein Anschlussvertrag ist nötig.`;
}

export type Filter = {
  status?: string;
  direction?: string;
  customerId?: string;
  q?: string;
  endsBefore?: string;
  deadlineWithinDays?: number;
};

const money = (value: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

export function createApp(
  config: ServiceConfig,
  replay: ReplayStore,
  ping: () => Promise<unknown>,
  now: () => Date = () => new Date(),
) {
  // Deadlines are derived once at the anchor and move with the rest.
  const all = shifted(raw.map((c) => enrich(c, ANCHOR.slice(0, 10))), now);
  const today = () => isoDay(demoNow(now()));
  const find = (id: string) => all().find((c) => c.id === id);
  const select = (f: Filter) =>
    all()
      .filter(
        (c) =>
          (!f.status || c.status === f.status) &&
          (!f.direction || c.direction === f.direction) &&
          (!f.customerId || c.customerId === f.customerId) &&
          (!f.endsBefore || c.endsOn <= f.endsBefore) &&
          (f.deadlineWithinDays === undefined ||
            (c.nextDeadline !== null && c.nextDeadline.days <= f.deadlineWithinDays)) &&
          includes([c.title, c.summary, c.counterparty, c.number, c.kind], f.q),
      )
      .sort((a, b) => (a.nextDeadline?.date ?? "9999").localeCompare(b.nextDeadline?.date ?? "9999") || a.endsOn.localeCompare(b.endsOn));

  const assets = viewAssets(config.origin, "contracts");
  const view = assets.view({
    title: "Verträge",
    scopes: [SCOPE],
    allowedTools: ["get_contract", "list_contracts"],
    fallback: "Die Vertragsansicht wird geladen. Zeigt dieser Client keine interaktiven Ansichten, steht dieselbe Übersicht als Text im Chat.",
  });

  const filterSchema = {
    type: "object",
    properties: {
      status: { enum: ["active", "draft", "expired"], description: "Vertragsstatus: active (laufend), draft (Entwurf), expired (beendet)." },
      direction: { enum: ["customer", "supplier"], description: "customer: Kundenverträge, supplier: Lieferanten- und Einkaufsverträge." },
      customerId: { type: "string", description: "CRM-Organisations-ID, z. B. org-200." },
      endsBefore: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Nur Verträge, deren Laufzeit bis zu diesem Datum endet (YYYY-MM-DD)." },
      deadlineWithinDays: { type: "integer", minimum: 0, maximum: 730, description: "Nur Verträge mit der nächsten Frist innerhalb dieser Tage." },
      q: { type: "string", maxLength: 100, description: "Suche in Titel, Vertragspartner, Nummer und Zusammenfassung." },
    },
    additionalProperties: false,
  } as const;

  const line = (c: ReturnType<typeof enrich>) =>
    `- ${c.id} · ${c.number} · ${c.title} (${c.counterparty}) · ${c.status} · Ende ${germanDate(c.endsOn)} · ${money(c.value)} ${c.valueBasis} · ${c.situation}`;

  const mcp = createNativeMcp({
    path: "/api/mcp",
    description:
      "Vertragsregister der Brakenstedt Antriebstechnik: Kunden- und Lieferantenverträge mit Laufzeiten, Kündigungsfristen, Verlängerungen, Werten und Klauseln. Für Fragen wie „Welche Verträge laufen bis Jahresende aus?“ oder „Was steht im Servicevertrag mit Rehwinkel zur Haftung?“.",
    discoveryScopes: [SCOPE],
    resources: [view],
    tools: [
      {
        name: "list_contracts",
        title: "Verträge und Fristen",
        description:
          "Listet Verträge mit nächster Frist (Kündigungsfrist, Option, Vertragsende), Wert und Lage in einem Satz, sortiert nach der nächsten Frist. Ohne Filter: alle Verträge. Für „bis Jahresende“ endsBefore auf den 31.12. des Jahres setzen. Clients mit MCP-App-Unterstützung zeigen dazu ein Fristenradar mit Zeitachse; dann die Liste nicht vollständig wiederholen, sondern die Frage beantworten und das Wichtigste nennen.",
        inputSchema: filterSchema,
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: view.uri } },
        async handler(args) {
          const filter = args as Filter;
          const items = select(filter);
          return toolResult(
            [`${items.length} Verträge, Stand ${germanDate(today())}:`, ...items.map(line)].join("\n"),
            { mode: "portfolio", today: today(), filter, items },
          );
        },
      },
      {
        name: "get_contract",
        title: "Vertragsdossier",
        description:
          "Ein Vertrag mit allen Klauseln, Fristen, Verlängerungsregel, Verantwortlichen und verknüpften Tickets und Verkaufschancen. Klauseln wörtlich zitieren, keine Rechtsberatung. Clients mit MCP-App-Unterstützung zeigen ein Dossier mit Fristen-Zeitachse und hervorgehobenen Klauseln.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string", pattern: "^ctr-\\d{4}$", description: "Vertrags-ID aus list_contracts, z. B. ctr-1003." } },
          required: ["id"],
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: view.uri } },
        async handler(args) {
          const item = find(String(args.id));
          if (!item) return toolError(`Es gibt keinen Vertrag mit der ID ${String(args.id)}.`);
          const clauses = item.clauses.map((c) => `${c.number} ${c.heading}: ${c.text}`);
          return toolResult(
            [line(item), item.summary, ...clauses].join("\n"),
            { mode: "dossier", today: today(), item },
          );
        },
      },
    ],
  });

  const service = createService({
    key: "contracts",
    name: "Vertragsregister",
    scope: SCOPE,
    config,
    replay,
    ping,
    skills: contractSkills(config.origin),
    mcp,
  });
  const { app, read, readOnly } = service;
  assets.register(app);
  app.get("/api/contracts", read, (c) => {
    const days = c.req.query("deadlineWithinDays");
    const items = select({
      status: c.req.query("status"),
      direction: c.req.query("direction"),
      customerId: c.req.query("customerId"),
      endsBefore: c.req.query("endsBefore"),
      q: c.req.query("q"),
      ...(days !== undefined && /^\d+$/.test(days) ? { deadlineWithinDays: Number(days) } : {}),
    });
    return c.json({ today: today(), items, total: items.length });
  });
  app.get("/api/contracts/:id", read, (c) => {
    const item = find(c.req.param("id"));
    return item ? c.json({ item }) : c.json(notFound, 404);
  });
  app.get("/api/contracts/:id/clauses", read, (c) => {
    const item = find(c.req.param("id"));
    return item ? c.json({ items: item.clauses }) : c.json(notFound, 404);
  });
  readOnly("/api/contracts/:id");
  return service;
}
