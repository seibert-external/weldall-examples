import type { ReplayStore } from "@weldall/sdk";
import { createNativeMcp } from "@weldall/sdk/mcp/server";
import type { ServiceConfig } from "../shared/config.js";
import { addDays, demoNow, isoDay, localDate } from "../shared/dates.js";
import { type Lang, LANGUAGE, langOf, langQuery, tr } from "../shared/lang.js";
import { createService, includes, notFound } from "../shared/service.js";
import { toolError, toolResult, viewAssets } from "../shared/ui.js";
import {
  age,
  appointmentBook,
  type Appointment,
  CONTACT_EN,
  KIND_EN,
  lastProphylaxis,
  NOTES,
  overdueDays,
  PATIENTS,
  type Patient,
  PRACTICE,
  PRACTITIONERS,
  type PractitionerId,
  recallDue,
  STATUS_EN,
  weekStart,
} from "./data.js";
import { praxisSkills } from "./skills.js";

const SCOPE = "praxis:read";
const WEEKDAYS = { de: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"], en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] };

const kind = (lang: Lang, code: string) => tr(lang, code, KIND_EN[code] ?? code);
const contact = (lang: Lang, code: string) => tr(lang, code, CONTACT_EN[code] ?? code);
const statusLabel = (lang: Lang, code: string) => tr(lang, code, STATUS_EN[code] ?? code);
const practitionerName = (id: PractitionerId) => PRACTITIONERS.find((p) => p.id === id)!.name;

/** Everything the tools need for one demo day; recomputed when the day changes. */
export function practiceDay(today: string) {
  const overdue = new Set(PATIENTS.filter((p) => overdueDays(today, p) > 0).map((p) => p.id));
  const book = appointmentBook(today, overdue);
  const monday = weekStart(today);
  const nextMonday = addDays(monday, 7);
  const lastVisit = new Map<string, Appointment>();
  const nextVisit = new Map<string, Appointment>();
  for (const a of book) {
    if (a.status === "erschienen") lastVisit.set(a.patientId, a);
    if (a.status === "geplant" && !nextVisit.has(a.patientId)) nextVisit.set(a.patientId, a);
  }
  return { today, book, monday, nextMonday, overdue, lastVisit, nextVisit };
}

type Day = ReturnType<typeof practiceDay>;

export function recallItem(day: Day, p: Patient, lang: Lang) {
  const days = overdueDays(day.today, p);
  const next = day.nextVisit.get(p.id);
  return {
    id: p.id,
    name: p.name,
    age: age(day.today, p.birthYear),
    insurance: p.insurance,
    contact: p.contact,
    contactLabel: contact(lang, p.contact),
    recallMonths: p.recallMonths,
    lastProphylaxis: lastProphylaxis(day.today, p),
    recallDue: recallDue(day.today, p),
    overdueDays: days,
    state: days > 0 ? "overdue" : days > -30 ? "due-soon" : "ok",
    note: p.note ? NOTES[p.note][lang] : null,
    nextAppointment: next ? { date: next.date, time: next.time, kind: next.kind, practitioner: practitionerName(next.practitioner) } : null,
  };
}

/** Free slots of one week, per day and practitioner. */
export function freeSlots(day: Day, week: "this" | "next", practitioner?: PractitionerId) {
  const monday = week === "next" ? day.nextMonday : day.monday;
  const taken = new Set(day.book.filter((a) => a.status !== "abgesagt").map((a) => `${a.date} ${a.time} ${a.practitioner}`));
  const days = [0, 1, 2, 3, 4].map((weekday) => {
    const date = addDays(monday, weekday);
    const slots = PRACTITIONERS.filter((p) => !practitioner || p.id === practitioner).flatMap((p) =>
      PRACTICE.hours
        .map((hour) => `${String(hour).padStart(2, "0")}:00`)
        .filter((time) => date >= day.today && !taken.has(`${date} ${time} ${p.id}`))
        .map((time) => ({ date, time, practitioner: p.id, practitionerName: p.name, prophylaxis: p.id === "herbst" })),
    );
    return { date, weekday, slots };
  });
  return { monday, days, total: days.reduce((sum, d) => sum + d.slots.length, 0) };
}

/** No-show rate per weekday over the past eight weeks. */
export function noShowRates(day: Day) {
  return [0, 1, 2, 3, 4].map((weekday) => {
    const past = day.book.filter(
      (a) => a.date < day.today && (new Date(`${a.date}T12:00:00Z`).getUTCDay() + 6) % 7 === weekday && a.status !== "abgesagt" && a.status !== "geplant",
    );
    const missed = past.filter((a) => a.status === "nicht erschienen").length;
    return { weekday, appointments: past.length, noShows: missed, rate: past.length ? Math.round((missed / past.length) * 1000) / 10 : 0 };
  });
}

export function createApp(
  config: ServiceConfig,
  replay: ReplayStore,
  ping: () => Promise<unknown>,
  now: () => Date = () => new Date(),
) {
  let cached: Day | undefined;
  const today = () => isoDay(demoNow(now()));
  const current = () => {
    const day = today();
    if (cached?.today !== day) cached = practiceDay(day);
    return cached;
  };
  const stand = (lang: Lang) => tr(lang, `Stand ${localDate(today(), lang)}.`, `As of ${localDate(today(), lang)}.`);
  const weekday = (lang: Lang, iso: string) => WEEKDAYS[lang][(new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7] ?? iso;

  type RecallFilter = { dueWithinDays?: number; contact?: string; q?: string };
  const recall = (lang: Lang, f: RecallFilter) => {
    const day = current();
    return PATIENTS.map((p) => recallItem(day, p, lang))
      .filter((p) => p.overdueDays > -(f.dueWithinDays ?? 0) && (!f.contact || p.contact === f.contact) && includes([p.name, p.id], f.q))
      .sort((a, b) => b.overdueDays - a.overdueDays);
  };

  const cockpit = (lang: Lang, f: RecallFilter) => {
    const day = current();
    const items = recall(lang, f);
    const week = freeSlots(day, "next");
    const prophylaxis = week.days.flatMap((d) => d.slots.filter((s) => s.prophylaxis));
    const rates = noShowRates(day);
    const all = PATIENTS.map((p) => recallItem(day, p, lang));
    return {
      items,
      summary: {
        patients: PATIENTS.length,
        overdue: all.filter((p) => p.state === "overdue").length,
        dueSoon: all.filter((p) => p.state === "due-soon").length,
        freeProphylaxisSlotsNextWeek: prophylaxis.length,
        freeSlotsNextWeek: week.total,
        noShowRate: Math.round((rates.reduce((s, r) => s + r.noShows, 0) / Math.max(1, rates.reduce((s, r) => s + r.appointments, 0))) * 1000) / 10,
      },
      prophylaxisSlots: prophylaxis,
      nextMonday: week.monday,
      noShow: rates,
    };
  };

  const recallLine = (lang: Lang, p: ReturnType<typeof recallItem>) =>
    `- ${p.id} · ${p.name} (${p.age}, ${p.insurance}) · ${
      p.overdueDays > 0 ? tr(lang, `${p.overdueDays} Tage überfällig`, `${p.overdueDays} days overdue`) : tr(lang, `fällig am ${localDate(p.recallDue, lang)}`, `due on ${localDate(p.recallDue, lang)}`)
    } · ${tr(lang, "letzte PZR", "last cleaning")} ${localDate(p.lastProphylaxis, lang)} · Recall ${p.recallMonths} ${tr(lang, "Monate", "months")} · ${tr(lang, "Kontakt", "contact")}: ${p.contactLabel}${p.note ? ` · ${p.note}` : ""}`;

  const slotLine = (lang: Lang, s: { date: string; time: string; practitionerName: string }) =>
    `${weekday(lang, s.date)} ${localDate(s.date, lang)} ${s.time} (${s.practitionerName})`;

  const assets = viewAssets(config.origin, "praxis", PRACTICE.name);
  const view = assets.view({
    title: "Recall-Cockpit",
    scopes: [SCOPE],
    allowedTools: ["list_recall", "free_slots", "no_show_rates", "get_patient"],
    fallback: "Das Recall-Cockpit wird geladen. Zeigt dieser Client keine interaktiven Ansichten, steht dieselbe Übersicht als Text im Chat.",
  });
  const ui = { ui: { resourceUri: view.uri } };
  const readOnly = { readOnlyHint: true, openWorldHint: false };

  const mcp = createNativeMcp({
    path: "/api/mcp",
    description: `Praxisverwaltung der ${PRACTICE.name} in ${PRACTICE.town} (erfundene Zahnarztpraxis): Patienten mit Prophylaxe-Recall, Terminbuch von Dr. Sommer, Dr. Winter und der Prophylaxe (ZMP Herbst), freie Slots und Ausfallquoten. Für Fragen wie „Wen laden wir diese Woche zur Prophylaxe ein?“ oder „Wo sind nächste Woche noch Lücken?“.`,
    discoveryScopes: [SCOPE],
    resources: [view],
    tools: [
      {
        name: "list_recall",
        title: "Recall-Cockpit",
        description:
          "Patienten, deren Prophylaxe (PZR) überfällig ist, sortiert nach Tagen über dem Recall-Termin, mit letzter PZR, Recall-Intervall, bevorzugtem Kontaktweg und Hinweisen. Dazu die freien Prophylaxe-Slots nächste Woche und die Ausfallquote. dueWithinDays nimmt auch bald fällige Patienten auf. Clients mit MCP-App-Unterstützung zeigen das Recall-Cockpit; dann die Liste nicht wiederholen, sondern die Frage beantworten und das Vorgehen empfehlen.",
        inputSchema: {
          type: "object",
          properties: {
            dueWithinDays: { type: "integer", minimum: 0, maximum: 90, description: "Auch Patienten, deren Recall in diesen Tagen fällig wird." },
            contact: { enum: ["SMS", "E-Mail", "Telefon", "Brief"], description: "Nur Patienten mit diesem Kontaktweg." },
            q: { type: "string", maxLength: 100, description: "Suche nach Name oder Patientennummer." },
            language: LANGUAGE,
          },
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: readOnly,
        _meta: ui,
        async handler(args) {
          const { language, ...filter } = args as RecallFilter & { language?: string };
          const lang = langOf(language);
          const data = cockpit(lang, filter);
          const s = data.summary;
          const head = tr(
            lang,
            `${stand(lang)} ${s.overdue} von ${s.patients} Patienten sind mit der Prophylaxe überfällig, ${s.dueSoon} werden in den nächsten 30 Tagen fällig. Nächste Woche sind ${s.freeProphylaxisSlotsNextWeek} Prophylaxe-Slots frei. Ausfallquote der letzten 8 Wochen: ${s.noShowRate} %.`,
            `${stand(lang)} ${s.overdue} of ${s.patients} patients are overdue for their professional cleaning, ${s.dueSoon} fall due in the next 30 days. Next week ${s.freeProphylaxisSlotsNextWeek} prophylaxis slots are free. No-show rate over the last 8 weeks: ${s.noShowRate}%.`,
          );
          const slots = data.prophylaxisSlots.map((x) => `- ${slotLine(lang, x)}`);
          return toolResult(
            [head, "", ...data.items.map((p) => recallLine(lang, p)), "", tr(lang, "Freie Prophylaxe-Slots nächste Woche:", "Free prophylaxis slots next week:"), ...slots].join("\n"),
            { mode: "cockpit", language: lang, today: today(), filter, practice: PRACTICE.name, ...data },
          );
        },
      },
      {
        name: "free_slots",
        title: "Freie Termine",
        description:
          "Freie Behandlungsslots einer Woche je Tag und Behandler (Sprechzeiten 8 bis 12 und 13 bis 17 Uhr, Slots zu einer Stunde). Prophylaxe macht ZMP Herbst (practitioner herbst). Standard: nächste Woche. Clients mit MCP-App-Unterstützung zeigen einen Wochenplan.",
        inputSchema: {
          type: "object",
          properties: {
            week: { enum: ["this", "next"], description: "this: laufende Woche ab heute, next: nächste Woche (Standard)." },
            practitioner: { enum: ["sommer", "winter", "herbst"], description: "sommer: Dr. Ilka Sommer, winter: Dr. Jan Winter, herbst: ZMP Maren Herbst (Prophylaxe)." },
            language: LANGUAGE,
          },
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: readOnly,
        _meta: ui,
        async handler(args) {
          const lang = langOf(args.language);
          const week = args.week === "this" ? "this" : "next";
          const practitioner = (["sommer", "winter", "herbst"] as const).find((p) => p === args.practitioner);
          const data = freeSlots(current(), week, practitioner);
          const lines = data.days.map((d) =>
            `${weekday(lang, d.date)} ${localDate(d.date, lang)}: ${d.slots.length ? d.slots.map((s) => `${s.time} ${s.practitionerName}`).join(", ") : tr(lang, "nichts frei", "nothing free")}`,
          );
          return toolResult(
            [`${stand(lang)} ${tr(lang, `${data.total} freie Slots`, `${data.total} free slots`)}:`, ...lines].join("\n"),
            { mode: "slots", language: lang, today: today(), week, practitioner: practitioner ?? null, practitioners: PRACTITIONERS.map((p) => ({ id: p.id, name: p.name, role: p.role[lang] })), ...data },
          );
        },
      },
      {
        name: "no_show_rates",
        title: "Ausfallquote je Wochentag",
        description:
          "Anteil nicht erschienener Patienten je Wochentag über die letzten acht Wochen (abgesagte Termine zählen nicht). Grundlage für Erinnerungen und Überbuchung. Clients mit MCP-App-Unterstützung zeigen ein Balkendiagramm.",
        inputSchema: { type: "object", properties: { language: LANGUAGE }, additionalProperties: false },
        scopes: [SCOPE],
        annotations: readOnly,
        _meta: ui,
        async handler(args) {
          const lang = langOf(args.language);
          const rates = noShowRates(current());
          const lines = rates.map((r) => `${WEEKDAYS[lang][r.weekday]}: ${r.rate} % (${r.noShows} ${tr(lang, "von", "of")} ${r.appointments})`);
          return toolResult(
            [stand(lang), ...lines].join("\n"),
            { mode: "noshow", language: lang, today: today(), rates },
          );
        },
      },
      {
        name: "get_patient",
        title: "Patient",
        description:
          "Ein Patient mit Recall-Stand, Kontaktweg, Hinweisen und allen Terminen der letzten acht und der nächsten drei Wochen. Keine Befunde oder Diagnosen, nur Verwaltungsdaten. Clients mit MCP-App-Unterstützung zeigen eine Patientenkarte.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", pattern: "^P-\\d{4}$", description: "Patientennummer aus list_recall, z. B. P-1004." },
            language: LANGUAGE,
          },
          required: ["id"],
          additionalProperties: false,
        },
        scopes: [SCOPE],
        annotations: readOnly,
        _meta: ui,
        async handler(args) {
          const lang = langOf(args.language);
          const patient = PATIENTS.find((p) => p.id === String(args.id).toUpperCase());
          if (!patient) return toolError(tr(lang, `Es gibt keinen Patienten ${String(args.id)}.`, `There is no patient ${String(args.id)}.`));
          const day = current();
          const item = recallItem(day, patient, lang);
          const appointments = day.book
            .filter((a) => a.patientId === patient.id)
            .map((a) => ({ ...a, kindLabel: kind(lang, a.kind), statusLabel: statusLabel(lang, a.status), practitionerName: practitionerName(a.practitioner) }));
          const lines = appointments.map((a) => `- ${localDate(a.date, lang)} ${a.time} · ${a.kindLabel} · ${a.practitionerName} · ${a.statusLabel}`);
          return toolResult(
            [stand(lang), recallLine(lang, item), ...lines].join("\n"),
            { mode: "patient", language: lang, today: today(), item, appointments },
          );
        },
      },
    ],
  });

  const service = createService({ key: "praxis", name: "Praxisverwaltung", scope: SCOPE, config, replay, ping, skills: praxisSkills(config.origin), mcp });
  const { app, read, readOnly: refuseWrites } = service;
  assets.register(app);
  app.get("/api/recall", read, (c) => {
    const lang = langQuery(c);
    const within = c.req.query("dueWithinDays");
    const items = recall(lang, { contact: c.req.query("contact"), q: c.req.query("q"), ...(within && /^\d+$/.test(within) ? { dueWithinDays: Number(within) } : {}) });
    return c.json({ today: today(), items, total: items.length });
  });
  app.get("/api/slots", read, (c) => {
    const practitioner = (["sommer", "winter", "herbst"] as const).find((p) => p === c.req.query("practitioner"));
    return c.json({ today: today(), ...freeSlots(current(), c.req.query("week") === "this" ? "this" : "next", practitioner) });
  });
  app.get("/api/no-shows", read, (c) => c.json({ today: today(), rates: noShowRates(current()) }));
  app.get("/api/patients/:id", read, (c) => {
    const patient = PATIENTS.find((p) => p.id === c.req.param("id").toUpperCase());
    if (!patient) return c.json(notFound, 404);
    const day = current();
    return c.json({ item: recallItem(day, patient, langQuery(c)), appointments: day.book.filter((a) => a.patientId === patient.id) });
  });
  refuseWrites("/api/patients/:id");
  return service;
}
