// Recall cockpit of the fictional dental practice: overdue prophylaxis patients
// next to next week's free prophylaxis slots and the no-show rate per weekday.
// Read-only: proposing an appointment or drafting an invitation goes to the chat.
const kit = await import(new URL(`./kit.js${new URL(import.meta.url).search}`, import.meta.url).href);
const { h, icon, pill, stat, props, reveal, fmtDate, empty, tr } = kit;

const DAYS = () => tr(["Mo", "Di", "Mi", "Do", "Fr"], ["Mon", "Tue", "Wed", "Thu", "Fri"]);
const DAYS_LONG = () => tr(["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"], ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
const CONTACT_ICON = { SMS: "chat", "E-Mail": "mail", Telefon: "phone", Brief: "file" };
const STATUS_TONE = { erschienen: null, "nicht erschienen": "danger", abgesagt: "warning", geplant: "accent" };
const pct = (value) => `${value.toLocaleString(tr("de-DE", "en-GB"), { maximumFractionDigits: 1 })} %`;
const weekdayOf = (iso) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;

let app;
let cockpitData = null;

const lang = () => tr("de", "en");
const openPatient = async (id) => {
  const data = await app.call("get_patient", { id, language: lang() });
  if (data) app.show(data);
};

const propose = (p) => app.ask(tr(
  `Schlage für ${p.name} (${p.id}) einen freien PZR-Termin bei ZMP Herbst nächste Woche vor, passend zu den Hinweisen, und entwirf die Einladung per ${p.contactLabel}. Sie-Form, kurz.`,
  `Propose a free professional cleaning slot with Maren Herbst next week for ${p.name} (${p.id}) that fits the notes, and draft the invitation by ${p.contactLabel}. Formal and short.`));

function overdueBar(days, max) {
  return h("div", { class: "od" },
    h("div", { class: "od-track" }, h("div", { class: ["od-fill", days > 120 ? "danger" : days > 30 ? "warning" : null], style: { width: `${Math.max(4, Math.min(100, (days / max) * 100))}%` } })),
    h("span", { class: ["small", "num", days > 120 ? "t-danger" : days > 30 ? "t-warning" : "muted"] }, days > 0 ? tr(`+${days} Tage`, `+${days} days`) : tr(`in ${-days} Tagen`, `in ${-days} days`)));
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2);
}

function patientRow(p, max) {
  return h("article", { class: ["item", "r-item", p.overdueDays > 120 ? "s-danger" : p.overdueDays > 30 ? "s-warning" : null], tabindex: 0,
    onclick: (e) => { if (!e.target.closest("button")) openPatient(p.id); },
    onkeydown: (e) => { if (e.key === "Enter" && !e.target.closest("button")) openPatient(p.id); } },
    h("span", { class: "avatar" }, initials(p.name)),
    h("div", { class: "grow r-main" },
      h("div", { class: "row" },
        h("span", { class: "item-title ellipsis grow" }, p.name),
        h("span", { class: "contact small muted", title: p.contactLabel }, icon(CONTACT_ICON[p.contact] ?? "user", 14), p.contactLabel)),
      overdueBar(p.overdueDays, max),
      h("div", { class: "item-sub ellipsis" },
        `${p.id} · ${p.age} ${tr("J.", "y")} · ${p.insurance} · Recall ${p.recallMonths} ${tr("Mon.", "mo")}`,
        p.note ? h("span", { class: "note" }, ` · ${p.note}`) : null)),
    h("button", { class: "btn sm", type: "button", disabled: !app.can.chat, title: tr("PZR-Termin vorschlagen", "Propose a cleaning slot"), onclick: (e) => { e.stopPropagation(); propose(p); } },
      icon("sparkles"), tr("PZR vorschlagen", "Propose slot")));
}

function slotPanel(slots) {
  const byDay = [0, 1, 2, 3, 4].map((d) => slots.filter((s) => weekdayOf(s.date) === d));
  return h("section", { class: "panel" },
    h("div", { class: "panel-head" }, h("h2", { class: "h2 grow" }, tr("Freie PZR-Slots nächste Woche", "Free cleaning slots next week")), h("span", { class: "small faint" }, slots.length)),
    h("div", { class: "panel-body slot-days" }, byDay.map((day, i) =>
      h("div", { class: "slot-day" },
        h("span", { class: "slot-label small muted" }, DAYS()[i], day[0] ? h("span", { class: "faint" }, ` ${fmtDate(day[0].date, { year: undefined })}`) : null),
        h("div", { class: "chips" }, day.length ? day.map((s) => h("span", { class: "chip" }, s.time)) : h("span", { class: "small faint" }, tr("voll", "full")))))));
}

function noShowBars(rates, compact = false) {
  const max = Math.max(10, ...rates.map((r) => r.rate));
  return h("div", { class: ["bars", compact && "compact"] }, rates.map((r) =>
    h("div", { class: "bar-row" },
      h("span", { class: "small muted" }, (compact ? DAYS() : DAYS_LONG())[r.weekday]),
      h("div", { class: "bar-track" }, h("div", { class: ["bar-fill", r.rate >= 10 && "warning"], style: { width: `${(r.rate / max) * 100}%` } })),
      h("span", { class: ["small", "num", r.rate >= 10 ? "t-warning" : "muted"] }, pct(r.rate)))));
}

// --- Cockpit -----------------------------------------------------------------------
function cockpit(data) {
  cockpitData = data;
  const s = data.summary;
  const overdue = data.items.filter((p) => p.overdueDays > 0);
  const soon = data.items.filter((p) => p.overdueDays <= 0);
  const max = Math.max(30, ...overdue.map((p) => p.overdueDays));
  const first = overdue.slice(0, 10);
  const rest = overdue.slice(10);
  return reveal(h("div", { class: "wrap" },
    h("header", { class: "hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, tr(`Prophylaxe-Recall · Stand ${fmtDate(data.today)}`, `Prophylaxis recall · as of ${fmtDate(data.today)}`)),
        h("h1", { class: "title" }, tr(`${s.overdue} Patienten überfällig, ${s.freeProphylaxisSlotsNextWeek} PZR-Slots frei`, `${s.overdue} patients overdue, ${s.freeProphylaxisSlotsNextWeek} cleaning slots free`)),
        h("p", { class: "subtitle" }, tr(`Nächste Woche lassen sich ${Math.min(s.overdue, s.freeProphylaxisSlotsNextWeek)} Lücken mit Recall-Patienten füllen.`,
          `Next week ${Math.min(s.overdue, s.freeProphylaxisSlotsNextWeek)} gaps can be filled with recall patients.`))),
      h("div", { class: "hero-figure" },
        h("div", { class: "figure t-accent" }, Math.min(s.overdue, s.freeProphylaxisSlotsNextWeek)),
        h("div", { class: "figure-label" }, tr("Termine zu gewinnen", "appointments to win")))),
    h("div", { class: "stats" },
      stat(s.overdue, tr("überfällig", "overdue"), s.overdue ? "danger" : null),
      stat(s.dueSoon, tr("fällig in 30 Tagen", "due in 30 days"), s.dueSoon ? "warning" : null),
      stat(s.freeProphylaxisSlotsNextWeek, tr("freie PZR-Slots", "free cleaning slots")),
      stat(pct(s.noShowRate), tr("Ausfallquote 8 Wochen", "no-shows, 8 weeks"))),
    h("div", { class: "split" },
      h("section", { class: "list" },
        h("div", { class: "group-head" }, h("span", { class: "eyebrow" }, tr("Zuerst anrufen", "Call first")), h("span", { class: "small faint" }, first.length)),
        first.map((p) => patientRow(p, max)),
        rest.length ? h("details", { class: "more" }, h("summary", {}, icon("chevronRight", 14), tr(`Weitere überfällige (${rest.length})`, `More overdue (${rest.length})`)), rest.map((p) => patientRow(p, max))) : null,
        soon.length ? h("details", { class: "more" }, h("summary", {}, icon("chevronRight", 14), tr(`Bald fällig (${soon.length})`, `Due soon (${soon.length})`)), soon.map((p) => patientRow(p, max))) : null),
      h("aside", { class: "side" },
        slotPanel(data.prophylaxisSlots),
        h("section", { class: "panel" },
          h("div", { class: "panel-head" }, h("h2", { class: "h2 grow" }, tr("Ausfälle je Wochentag", "No-shows by weekday"))),
          h("div", { class: "panel-body" }, noShowBars(data.noShow, true))))),
    h("div", { class: "actions" },
      h("button", { class: "btn primary", type: "button", disabled: !app.can.chat, onclick: () => app.ask(tr(
        `Ordne den ${Math.min(s.overdue, s.freeProphylaxisSlotsNextWeek)} am längsten überfälligen Patienten die freien PZR-Slots nächste Woche zu, beachte die Hinweise, und entwirf die Einladungen je Kontaktweg.`,
        `Match the ${Math.min(s.overdue, s.freeProphylaxisSlotsNextWeek)} most overdue patients to next week's free cleaning slots, respecting the notes, and draft the invitations per contact channel.`)) },
        icon("sparkles"), tr("Einladungen entwerfen", "Draft invitations")),
      h("button", { class: "btn", type: "button", disabled: !app.can.call, onclick: async () => { const d = await app.call("free_slots", { language: lang() }); if (d) app.show(d); } },
        icon("calendar"), tr("Wochenplan nächste Woche", "Next week's plan")),
      h("button", { class: "btn ghost", type: "button", disabled: !app.can.chat, onclick: () => app.ask(tr(
        "Was können wir gegen die Ausfälle am Montag und Freitag tun?", "What can we do about the no-shows on Mondays and Fridays?")) },
        icon("chat"), tr("Ausfälle besprechen", "Discuss no-shows")))));
}

// --- Week plan ------------------------------------------------------------------------
function slots(data) {
  const people = data.practitioners.filter((p) => !data.practitioner || p.id === data.practitioner);
  return reveal(h("div", { class: "wrap" },
    cockpitData && app.can.call ? h("button", { class: "btn ghost sm back", type: "button", onclick: () => app.show(cockpitData) }, icon("arrowLeft"), tr("Recall-Cockpit", "Recall cockpit")) : null,
    h("header", { class: "hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, data.week === "next" ? tr("Nächste Woche", "Next week") : tr("Diese Woche", "This week")),
        h("h1", { class: "title" }, tr(`${data.total} freie Slots ab ${fmtDate(data.monday)}`, `${data.total} free slots from ${fmtDate(data.monday)}`)),
        h("p", { class: "subtitle" }, tr("Sprechzeiten 8 bis 12 und 13 bis 17 Uhr, Slots zu einer Stunde.", "Surgery hours 8 to 12 and 1 to 5 pm, one-hour slots.")))),
    h("div", { class: "week", style: { "--days": 5 } },
      h("div", {}), data.days.map((d) => h("div", { class: "week-head small muted" }, DAYS()[d.weekday], h("span", { class: "faint" }, ` ${fmtDate(d.date, { year: undefined })}`))),
      people.map((p) => [
        h("div", { class: "week-who" }, h("strong", { class: "small" }, p.name), h("span", { class: "small faint" }, p.role)),
        data.days.map((d) => {
          const free = d.slots.filter((s) => s.practitioner === p.id);
          return h("div", { class: ["week-cell", p.id === "herbst" && "pzr"] },
            free.length ? free.map((s) => h("span", { class: "chip" }, s.time)) : h("span", { class: "small faint" }, "–"));
        }),
      ])),
    h("div", { class: "actions" },
      h("button", { class: "btn primary", type: "button", disabled: !app.can.chat, onclick: () => app.ask(tr(
        "Wie füllen wir die Lücken nächste Woche? Nutze für Prophylaxe-Slots die überfälligen Recall-Patienten.",
        "How do we fill next week's gaps? Use the overdue recall patients for the prophylaxis slots.")) }, icon("sparkles"), tr("Lücken füllen", "Fill the gaps")))));
}

// --- No-shows ---------------------------------------------------------------------------
function noshow(data) {
  const worst = [...data.rates].sort((a, b) => b.rate - a.rate)[0];
  const total = data.rates.reduce((s, r) => s + r.noShows, 0);
  return reveal(h("div", { class: "wrap" },
    cockpitData && app.can.call ? h("button", { class: "btn ghost sm back", type: "button", onclick: () => app.show(cockpitData) }, icon("arrowLeft"), tr("Recall-Cockpit", "Recall cockpit")) : null,
    h("header", { class: "hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, tr("Letzte 8 Wochen", "Last 8 weeks")),
        h("h1", { class: "title" }, tr(`${total} Termine ohne Absage ausgefallen`, `${total} appointments missed without notice`)),
        h("p", { class: "subtitle" }, tr(`Am meisten am ${DAYS_LONG()[worst.weekday]}: ${pct(worst.rate)}.`, `Most on ${DAYS_LONG()[worst.weekday]}: ${pct(worst.rate)}.`)))),
    h("section", { class: "panel" }, h("div", { class: "panel-body" }, noShowBars(data.rates)))));
}

// --- Patient -------------------------------------------------------------------------------
function patient(data) {
  const p = data.item;
  const past = data.appointments.filter((a) => a.status !== "geplant").reverse();
  const next = data.appointments.filter((a) => a.status === "geplant");
  const state = p.overdueDays > 0 ? pill(tr(`${p.overdueDays} Tage überfällig`, `${p.overdueDays} days overdue`), p.overdueDays > 120 ? "danger" : "warning", "alert")
    : p.overdueDays > -30 ? pill(tr(`fällig am ${fmtDate(p.recallDue)}`, `due on ${fmtDate(p.recallDue)}`), "warning", "clock")
      : pill(tr("Recall im Plan", "Recall on track"), "success", "check");
  const appt = (a) => h("li", { class: "appt" },
    h("span", { class: "small num" }, `${fmtDate(a.date)} ${a.time}`),
    h("span", { class: "grow small" }, a.kindLabel, h("span", { class: "faint" }, ` · ${a.practitionerName}`)),
    pill(a.statusLabel, STATUS_TONE[a.status]));
  return reveal(h("div", { class: "wrap" },
    cockpitData && app.can.call ? h("button", { class: "btn ghost sm back", type: "button", onclick: () => app.show(cockpitData) }, icon("arrowLeft"), tr("Recall-Cockpit", "Recall cockpit")) : null,
    h("header", { class: "hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, h("span", { class: "mono" }, p.id), ` · ${p.age} ${tr("Jahre", "years")} · ${p.insurance}`),
        h("h1", { class: "title" }, p.name),
        h("div", { class: "row pills" }, state, p.note ? h("span", { class: "small muted" }, p.note) : null))),
    h("div", { class: "split" },
      h("section", { class: "panel" },
        h("div", { class: "panel-head" }, h("h2", { class: "h2 grow" }, tr("Termine", "Appointments"))),
        h("div", { class: "panel-body" },
          next.length ? h("ol", { class: "appts" }, next.map(appt)) : h("p", { class: "small muted" }, tr("Kein Termin geplant.", "No appointment scheduled.")),
          past.length ? h("ol", { class: "appts past" }, past.map(appt)) : null)),
      h("aside", { class: "panel" }, h("div", { class: "panel-body" }, props([
        [tr("Letzte PZR", "Last cleaning"), fmtDate(p.lastProphylaxis)],
        [tr("Recall", "Recall"), tr(`alle ${p.recallMonths} Monate`, `every ${p.recallMonths} months`)],
        [tr("Fällig seit", "Due since"), fmtDate(p.recallDue)],
        [tr("Kontaktweg", "Contact"), h("span", { class: "row" }, icon(CONTACT_ICON[p.contact] ?? "user", 14), p.contactLabel)],
      ])))),
    h("div", { class: "actions" },
      h("button", { class: "btn primary", type: "button", disabled: !app.can.chat, onclick: () => propose(p) }, icon("sparkles"), tr("PZR-Termin vorschlagen", "Propose a cleaning slot")))));
}

app = await kit.start({
  title: { de: "Recall-Cockpit", en: "Recall cockpit" },
  render: (data, host) => {
    app = host;
    if (data.mode === "slots") return slots(data);
    if (data.mode === "noshow") return noshow(data);
    if (data.mode === "patient") return patient(data);
    if (data.mode === "cockpit") return cockpit(data);
    return empty("alert", tr("Unbekannte Ansicht.", "Unknown view."));
  },
});
