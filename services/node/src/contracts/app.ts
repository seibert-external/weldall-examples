import type { ReplayStore } from "@weldall/sdk";
import { createNativeMcp } from "@weldall/sdk/mcp/server";
import type { ServiceConfig } from "../shared/config.js";
import { addMonths, ANCHOR, daysBetween, demoNow, isoDay, localDate, shifted } from "../shared/dates.js";
import { type Lang, LANGUAGE, langOf, langQuery, money, tr } from "../shared/lang.js";
import { createService, includes, notFound } from "../shared/service.js";
import { toolError, toolResult, viewAssets } from "../shared/ui.js";
import { contracts as DE, type Contract as GermanContract } from "./data.js";
import { contracts as EN, type Contract as EnglishContract } from "./data.en.js";
import { contractSkills } from "./skills.js";

const SCOPE = "contracts:read";

type Contract = GermanContract | EnglishContract;

export type Deadline = {
  date: string;
  label: string;
  kind: "notice" | "milestone" | "end" | "renewal";
  days: number;
};

/** Derived facts the register does not store: deadlines relative to today. */
export function enrich<C extends Contract>(contract: C, today: string, lang: Lang = "de") {
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
    ...(noticeDeadline ? [{ date: noticeDeadline, label: tr(lang, "Kündigungsfrist", "Notice deadline"), kind: "notice" as const }] : []),
    ...contract.milestones.map((m) => ({ ...m, kind: "milestone" as const })),
    { date: endsOn, label: renewedUntil ? tr(lang, "Ende der Laufzeit", "End of term") : tr(lang, "Vertragsende", "Contract end"), kind: "end" as const },
    ...(renewedUntil ? [{ date: renewedUntil, label: tr(lang, "Ende der Verlängerung", "End of renewal"), kind: "renewal" as const }] : []),
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
  const situation = (lang === "en" ? situationEn : situationDe)(contract, today, noticeDeadline, renewedUntil, next);
  return { ...contract, noticeDeadline, renewedUntil, deadlines, nextDeadline: next, urgency, situation };
}

type Situation = (
  c: Contract,
  today: string,
  noticeDeadline: string | null,
  renewedUntil: string | null,
  next: Deadline | null,
) => string;

const situationDe: Situation = (c, today, noticeDeadline, renewedUntil, next) => {
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
};

const situationEn: Situation = (c, today, noticeDeadline, renewedUntil, next) => {
  if (c.status === "draft") return `Draft, not yet signed. Planned start on [[${c.startsOn}]].`;
  if (c.status === "expired") return `Ended on [[${c.endsOn}]].`;
  if (renewedUntil)
    return `Notice deadline of [[${noticeDeadline!}]] has passed. The contract renews automatically until [[${renewedUntil}]].`;
  if (next?.kind === "milestone")
    return `${next.label}: [[${next.date}]] (${next.days === 0 ? "today" : `in ${next.days} days`}).`;
  if (noticeDeadline && noticeDeadline >= today)
    return c.renewal.automatic
      ? `Notice possible until [[${noticeDeadline}]], otherwise the contract renews for ${c.renewal.months} months.`
      : `Ends on [[${c.endsOn}]]. A decision on continuing it is due by [[${noticeDeadline}]].`;
  return `Ends on [[${c.endsOn}]] without renewal. A follow-on contract is needed.`;
};

type Enriched = ReturnType<typeof enrich<Contract>>;

export type Filter = {
  status?: string;
  direction?: string;
  customerId?: string;
  q?: string;
  endsBefore?: string;
  deadlineWithinDays?: number;
};

export function createApp(
  config: ServiceConfig,
  replay: ReplayStore,
  ping: () => Promise<unknown>,
  now: () => Date = () => new Date(),
) {
  // Deadlines are derived once at the anchor, per language, and move with the rest.
  const anchor = ANCHOR.slice(0, 10);
  const data = {
    de: shifted<Enriched[]>(DE.map((c) => enrich(c, anchor, "de")), now, "de"),
    en: shifted<Enriched[]>(EN.map((c) => enrich(c, anchor, "en")), now, "en"),
  };
  const today = () => isoDay(demoNow(now()));
  const find = (lang: Lang, id: string) => data[lang]().find((c) => c.id === id);
  const select = (lang: Lang, f: Filter) =>
    data[lang]()
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
      language: LANGUAGE,
    },
    additionalProperties: false,
  } as const;

  const line = (lang: Lang, c: Enriched) =>
    `- ${c.id} · ${c.number} · ${c.title} (${c.counterparty}) · ${c.status} · ${tr(lang, "Ende", "ends")} ${localDate(c.endsOn, lang)} · ${money(c.value, lang)} ${c.valueBasis} · ${c.situation}`;

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
          const { language, ...filter } = args as Filter & { language?: string };
          const lang = langOf(language);
          const items = select(lang, filter);
          const head = tr(lang, `${items.length} Verträge, Stand ${localDate(today(), lang)}:`, `${items.length} contracts as of ${localDate(today(), lang)}:`);
          return toolResult(
            [head, ...items.map((c) => line(lang, c))].join("\n"),
            { mode: "portfolio", language: lang, today: today(), filter, items },
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
          properties: {
            id: { type: "string", pattern: "^ctr-\\d{4}$", description: "Vertrags-ID aus list_contracts, z. B. ctr-1003." },
            language: LANGUAGE,
          },
          required: ["id"],
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: { readOnlyHint: true, openWorldHint: false },
        _meta: { ui: { resourceUri: view.uri } },
        async handler(args) {
          const lang = langOf(args.language);
          const item = find(lang, String(args.id));
          if (!item) return toolError(tr(lang, `Es gibt keinen Vertrag mit der ID ${String(args.id)}.`, `There is no contract with the ID ${String(args.id)}.`));
          const clauses = item.clauses.map((c) => `${c.number} ${c.heading}: ${c.text}`);
          return toolResult(
            [line(lang, item), item.summary, ...clauses].join("\n"),
            { mode: "dossier", language: lang, today: today(), item },
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
    const items = select(langQuery(c), {
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
    const item = find(langQuery(c), c.req.param("id"));
    return item ? c.json({ item }) : c.json(notFound, 404);
  });
  app.get("/api/contracts/:id/clauses", read, (c) => {
    const item = find(langQuery(c), c.req.param("id"));
    return item ? c.json({ items: item.clauses }) : c.json(notFound, 404);
  });
  readOnly("/api/contracts/:id");
  return service;
}
