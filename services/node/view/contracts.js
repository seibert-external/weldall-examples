// Contract view: a deadline radar for a list result, a dossier for one contract.
const kit = await import(new URL(`./kit.js${new URL(import.meta.url).search}`, import.meta.url).href);
const { h, icon, stat, props, ring, reveal, fmtDate, fmtMonth, fmtMoney, relDays, daysBetween, menu, empty, ics, tr } = kit;

// Colour only where a deadline needs action: red within two weeks, amber within
// sixty days or after a missed notice. Everything else stays neutral.
const TONE = { critical: "danger", soon: "warning", missed: "warning" };
// Status and clause tags are codes; labels follow the language of the result.
const STATUS = () => ({ active: tr("Laufend", "Active"), draft: tr("Entwurf", "Draft"), expired: tr("Beendet", "Ended") });
const TAGS = () => ({
  frist: tr("Frist", "Notice"), preis: tr("Preis", "Price"), haftung: tr("Haftung", "Liability"), sla: "SLA",
  datenschutz: tr("Datenschutz", "Data protection"), abnahme: tr("Abnahme", "Acceptance"),
});
const HORIZON = 180;

let lastList = null;
let app;

async function open(id) {
  const data = await app.call("get_contract", { id, language: tr("de", "en") });
  if (data) app.show(data);
}

const money = (value) => fmtMoney(value, "EUR", true);
// valueBasis is German or English text, depending on the dataset.
const annual = (c) => c.valueBasis === "jährlich" || c.valueBasis === "annual";
const callOff = (c) => c.valueBasis === "Abrufvolumen" || c.valueBasis === "call-off volume";
const perYear = (c) => (annual(c) ? tr(" / Jahr", " / year") : callOff(c) ? tr(" Abruf", " call-off") : "");
const addDays = (iso, days) => new Date(Date.parse(`${iso}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const dayTone = (days) => (days <= 14 ? "danger" : days <= 60 ? "warning" : null);

function calendarFile(c, d) {
  return app.download(`${tr("frist", "deadline")}-${c.number}.ics`, "text/calendar", ics({
    uid: `${c.id}-${d.date}`, title: `${d.label}: ${c.title}`, date: d.date,
    description: `${c.number} · ${c.counterparty}\n${c.situation}\n${tr("Verantwortlich", "Owner")}: ${c.owner}`,
  }));
}

function actions(c) {
  const d = c.nextDeadline;
  return menu([
    { label: tr("Dossier öffnen", "Open dossier"), icon: "file", disabled: !app.can.call, run: () => open(c.id) },
    { label: tr("Frist in den Kalender", "Add deadline to calendar"), icon: "calendar", disabled: !app.can.download || !d, run: () => calendarFile(c, d) },
    "-",
    { label: c.direction === "customer" ? tr("Verlängerungsangebot vorbereiten", "Prepare renewal offer") : tr("Kündigung entwerfen", "Draft notice of termination"), icon: "sparkles", disabled: !app.can.chat, run: () =>
      app.ask(c.direction === "customer"
        ? tr(`Bereite für ${c.counterparty} ein Verlängerungsangebot zu Vertrag ${c.number} (${c.id}) vor. Berücksichtige Preisanpassungsklausel, offene Tickets und Chancen im CRM.`,
          `Prepare a renewal offer for ${c.counterparty} on contract ${c.number} (${c.id}). Take into account the price adjustment clause, open tickets and opportunities in the CRM.`)
        : tr(`Entwirf eine fristgerechte Kündigung von Vertrag ${c.number} (${c.id}) gegenüber ${c.counterparty}. Nenne Frist und Zugangsweg und prüfe, ob eine Verhandlung sinnvoller ist.`,
          `Draft a timely notice of termination of contract ${c.number} (${c.id}) to ${c.counterparty}. State the deadline and how to deliver it, and check whether negotiating would make more sense.`)) },
    { label: tr("Im Chat besprechen", "Discuss in chat"), icon: "chat", disabled: !app.can.chat, run: () =>
      app.ask(tr(`Fasse Vertrag ${c.number} (${c.id}) mit ${c.counterparty} zusammen: Fristen, Risiken und was ich jetzt tun sollte.`,
        `Summarise contract ${c.number} (${c.id}) with ${c.counterparty}: deadlines, risks and what I should do now.`)) },
  ]);
}

// --- Radar ---------------------------------------------------------------------
function portfolio(data) {
  lastList = data;
  const items = data.items;
  if (!items.length) return empty("file", tr("Keine Verträge für diese Auswahl.", "No contracts for this selection."));
  const running = items.filter((c) => c.status === "active");
  const dated = running.filter((c) => c.nextDeadline && c.urgency !== "missed").sort((a, b) => a.nextDeadline.date.localeCompare(b.nextDeadline.date));
  const urgent = running.filter((c) => c.urgency === "critical" || c.urgency === "soon");
  const missed = running.filter((c) => c.urgency === "missed");
  const yearly = running.filter(annual).reduce((sum, c) => sum + c.value, 0);
  const atStake = urgent.filter(annual).reduce((sum, c) => sum + c.value, 0);
  const first = dated[0];
  const rest = items.filter((c) => !dated.includes(c) && !missed.includes(c));

  return reveal(h("div", { class: "wrap" },
    h("header", { class: "hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, tr("Vertragsregister", "Contract register")),
        h("h1", { class: "title" }, tr(`${urgent.length} Fristen in den nächsten 60 Tagen`, `${urgent.length} ${urgent.length === 1 ? "deadline" : "deadlines"} in the next 60 days`)),
        h("p", { class: "subtitle" }, tr(`${running.length} laufende Verträge · ${money(yearly)} Jahreswert`, `${running.length} active contracts · ${money(yearly)} annual value`))),
      first ? h("div", { class: "hero-figure" },
        h("div", { class: ["figure", dayTone(first.nextDeadline.days) && `t-${dayTone(first.nextDeadline.days)}`] },
          first.nextDeadline.days, h("small", {}, first.nextDeadline.days === 1 ? tr("Tag", "day") : tr("Tage", "days"))),
        h("div", { class: "figure-label" }, `${tr("bis", "until")} ${first.nextDeadline.label} · ${first.counterparty.replace(/ (GmbH|AG|KG|GbR)$/, "")}`)) : null),
    h("div", { class: "stats" },
      stat(running.length, tr("laufende Verträge", "active contracts")),
      stat(urgent.length, tr("Fristen ≤ 60 Tage", "deadlines ≤ 60 days"), urgent.length ? "warning" : null),
      stat(money(atStake), tr("Jahreswert betroffen", "annual value affected")),
      stat(missed.length, tr("automatisch verlängert", "renewed automatically"))),
    radar(data.today, dated),
    h("section", { class: "list", "aria-label": tr("Fristen nach Monat", "Deadlines by month") }, agenda(dated, missed, rest)),
  ));
}

function radar(today, contracts) {
  const rows = contracts.filter((c) => c.nextDeadline.days <= HORIZON).slice(0, 8);
  if (!rows.length) return null;
  const pos = (iso) => `${Math.min(100, Math.max(0, (daysBetween(today, iso) / HORIZON) * 100))}%`;
  const months = [];
  for (let i = 1; i <= 6; i++) {
    const [y, m] = today.split("-").map(Number);
    const iso = new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 10);
    if (daysBetween(today, iso) < HORIZON) months.push(iso);
  }
  const windows = [[0, 14, "danger"], [14, 60, "warning"]];
  return h("section", { class: "panel radar", "aria-label": tr("Fristenradar der nächsten sechs Monate", "Deadline radar for the next six months") },
    h("div", { class: "panel-head" }, h("h2", { class: "h2 grow" }, tr("Fristenradar", "Deadline radar")), h("span", { class: "small faint" }, tr("nächste 6 Monate", "next 6 months"))),
    h("div", { class: "panel-body" },
      h("div", { class: "rd" },
        h("div", { class: "rd-axis" }, h("span"), h("div", { class: "rd-track" },
          windows.map(([from, to, tone]) => h("span", { class: `rd-window ${tone}`, style: { left: `${(from / HORIZON) * 100}%`, width: `${((to - from) / HORIZON) * 100}%` } })),
          h("span", { class: "rd-month today", style: { left: "0%" } }, tr("Heute", "Today")),
          months.map((m) => h("span", { class: "rd-month", style: { left: pos(m) } }, fmtMonth(m))))),
        rows.map((c) => {
          const d = c.nextDeadline;
          const end = c.renewedUntil && c.renewedUntil < addDays(today, HORIZON) ? c.renewedUntil : c.endsOn;
          const tone = dayTone(d.days);
          return h("button", { class: "rd-row", type: "button", onclick: () => open(c.id), title: c.situation },
            h("span", { class: "rd-label" }, h("span", { class: "ellipsis" }, c.counterparty), h("span", { class: "rd-kind ellipsis" }, d.label)),
            h("span", { class: "rd-track" },
              months.map((m) => h("span", { class: "rd-tick", style: { left: pos(m) } })),
              h("span", { class: "rd-life", style: { left: pos(d.date), width: `calc(${pos(end)} - ${pos(d.date)})` } }),
              h("span", { class: ["rd-run", tone], style: { width: pos(d.date) } }),
              h("span", { class: ["rd-mark", tone, d.kind], style: { left: pos(d.date) } }),
              h("span", { class: "rd-days num", style: { left: pos(d.date) } }, tr(`${d.days} T`, `${d.days} d`))));
        })),
      h("div", { class: "rd-legend small faint" },
        h("span", {}, h("i", { class: "rd-key danger" }), tr("≤ 14 Tage", "≤ 14 days")), h("span", {}, h("i", { class: "rd-key warning" }), tr("≤ 60 Tage", "≤ 60 days")),
        h("span", {}, h("i", { class: "rd-key line" }), tr("Restlaufzeit danach", "Remaining term after")))),
  );
}

function agenda(dated, missed, rest) {
  const out = [];
  if (missed.length) {
    out.push(groupHead(tr("Frist verpasst", "Deadline missed"), missed.length));
    out.push(...missed.map((c) => agendaItem(c, c.renewedUntil, tr("automatisch verlängert bis", "renewed automatically until"), "warning")));
  }
  const soon = dated.filter((c) => c.nextDeadline.days <= HORIZON);
  const later = dated.filter((c) => c.nextDeadline.days > HORIZON);
  let month = null;
  for (const c of soon) {
    const key = c.nextDeadline.date.slice(0, 7);
    if (key !== month) {
      month = key;
      const inMonth = soon.filter((x) => x.nextDeadline.date.startsWith(key));
      out.push(groupHead(fmtDate(`${key}-15`, { day: undefined, month: "long" }), inMonth.length));
    }
    out.push(agendaItem(c, c.nextDeadline.date, c.nextDeadline.label, TONE[c.urgency]));
  }
  if (later.length) out.push(h("details", { class: "more" }, h("summary", {}, icon("chevronRight", 14), tr(`Später als in 6 Monaten (${later.length})`, `Later than 6 months (${later.length})`)),
    later.map((c) => agendaItem(c, c.nextDeadline.date, c.nextDeadline.label, null))));
  if (rest.length) out.push(h("details", { class: "more" }, h("summary", {}, icon("chevronRight", 14), tr(`Ohne anstehende Frist (${rest.length})`, `No upcoming deadline (${rest.length})`)),
    rest.map((c) => agendaItem(c, c.status === "draft" ? c.startsOn : c.endsOn, c.status === "draft" ? tr("Entwurf, Beginn", "Draft, starts") : STATUS()[c.status], null))));
  return out;
}

const groupHead = (label, count) => h("div", { class: "group-head" }, h("span", { class: "eyebrow" }, label), h("span", { class: "small faint" }, count));

function agendaItem(c, date, label, tone) {
  const days = c.urgency !== "missed" && c.nextDeadline && date === c.nextDeadline.date ? c.nextDeadline.days : null;
  return h("article", { class: ["item", "c-item", tone && `s-${tone}`], tabindex: 0,
    onclick: (e) => { if (!e.target.closest(".menu")) open(c.id); },
    onkeydown: (e) => { if (e.key === "Enter") open(c.id); } },
    h("div", { class: "datebox" }, h("strong", {}, date ? date.slice(8, 10) : "–"), h("span", {}, date ? fmtMonth(date) : "")),
    h("div", { class: "grow" },
      h("div", { class: "item-title ellipsis" }, c.title),
      h("div", { class: "item-sub ellipsis" }, `${c.counterparty} · ${c.direction === "customer" ? tr("Kunde", "Customer") : tr("Lieferant", "Supplier")} · ${c.number}`)),
    h("div", { class: "c-when" },
      h("div", { class: ["small", tone && `t-${tone}`] }, days !== null ? `${label} ${relDays(days)}` : label),
      h("div", { class: "small faint" }, date ? fmtDate(date, { weekday: "short" }) : "")),
    h("div", { class: "end c-value" }, h("div", { class: "item-title" }, c.value === 0 ? "–" : money(c.value)), h("div", { class: "small faint" }, c.value === 0 ? tr("kostenfrei", "free of charge") : annual(c) ? tr("pro Jahr", "per year") : callOff(c) ? tr("Abruf", "call-off") : tr("gesamt", "total"))),
    actions(c));
}

// --- Dossier -----------------------------------------------------------------
function dossier(data) {
  const c = data.item;
  const tone = TONE[c.urgency];
  const d = c.nextDeadline;
  return reveal(h("div", { class: "wrap" },
    lastList && app.can.call ? h("button", { class: "btn ghost sm back", type: "button", onclick: () => app.show(lastList) }, icon("arrowLeft"), tr("Alle Verträge", "All contracts")) : null,
    h("header", { class: "hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, `${c.number} · ${c.kind}`),
        h("h1", { class: "title" }, c.title),
        h("p", { class: "subtitle" }, c.counterparty, c.counterpartyContact ? ` · ${c.counterpartyContact}` : "")),
      h("div", { class: "hero-figure" },
        h("div", { class: "figure" }, c.value === 0 ? "0 €" : fmtMoney(c.value, c.currency, true), perYear(c) ? h("small", {}, perYear(c).replace(" / ", "/")) : null),
        h("div", { class: "figure-label" }, `${tr("netto", "net")} · ${STATUS()[c.status]} · ${c.direction === "customer" ? tr("Kundenvertrag", "Customer contract") : tr("Lieferantenvertrag", "Supplier contract")}`))),
    h("div", { class: ["callout", tone] }, icon(tone ? "alert" : "calendar", 18),
      h("div", { class: "lead" }, c.situation),
      d ? h("div", { class: "when" }, relDays(d.days)) : null),
    term(c, data.today),
    h("section", { class: "panel" },
      h("div", { class: "panel-head" }, h("h2", { class: "h2 grow" }, tr("Klauseln", "Clauses")), h("span", { class: "small faint" }, tr(`${c.clauses.length} Paragrafen`, `${c.clauses.length} sections`))),
      h("div", { class: "clauses" }, c.clauses.map((cl) => clause(c, cl)))),
    h("div", { class: "actions" },
      h("button", { class: "btn primary", type: "button", disabled: !app.can.chat, onclick: () =>
        app.ask(tr(`Was sollte ich zu Vertrag ${c.number} (${c.id}) mit ${c.counterparty} als Nächstes tun? Berücksichtige Fristen, Preisklausel, offene Tickets und Chancen.`,
          `What should I do next on contract ${c.number} (${c.id}) with ${c.counterparty}? Take into account deadlines, the price clause, open tickets and opportunities.`)) },
        icon("sparkles"), tr("Nächste Schritte vorschlagen", "Suggest next steps")),
      d ? h("button", { class: "btn", type: "button", disabled: !app.can.download, onclick: () => calendarFile(c, d) }, icon("calendar"), tr("Frist in den Kalender", "Add deadline to calendar")) : null,
      h("span", { class: "grow" }),
      actions(c)),
  ));
}

// Elapsed term as a ring, the milestones as a vertical track: close deadlines
// stay readable next to a signing date years ago.
function term(c, today) {
  const total = Math.max(1, daysBetween(c.startsOn, c.renewedUntil ?? c.endsOn));
  const elapsed = Math.min(1, Math.max(0, daysBetween(c.startsOn, today) / total));
  const left = daysBetween(today, c.renewedUntil ?? c.endsOn);
  const points = [
    c.signedOn && { date: c.signedOn, label: tr("Unterzeichnet", "Signed") },
    { date: c.startsOn, label: tr("Vertragsbeginn", "Contract start") },
    ...c.deadlines.map((x) => ({ date: x.date, label: x.label })),
  ].filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
  const todayAt = points.findIndex((p) => p.date > today);
  const steps = points.map((p) => {
    const days = daysBetween(today, p.date);
    const tone = days < 0 ? null : dayTone(days);
    return h("li", { class: ["ms", days < 0 && "past", tone] },
      h("span", { class: "ms-dot" }),
      h("span", { class: "ms-label" }, p.label),
      h("span", { class: "ms-date num" }, fmtDate(p.date)),
      h("span", { class: ["ms-rel", "small", tone && `t-${tone}`] }, days < 0 ? "" : relDays(days)));
  });
  steps.splice(todayAt < 0 ? steps.length : todayAt, 0, h("li", { class: "ms today" }, h("span", { class: "ms-dot" }), h("span", { class: "ms-label" }, tr("Heute", "Today")), h("span", { class: "ms-date num" }, fmtDate(today)), h("span")));
  return h("section", { class: "panel term" },
    h("div", { class: "panel-body term-body" },
      h("div", { class: "term-ring" },
        ring(elapsed, { size: 128, stroke: 10, children: [h("strong", { class: "num" }, tr(`${Math.round(elapsed * 100)} %`, `${Math.round(elapsed * 100)}%`)), h("span", {}, tr("Laufzeit", "Term"))] }),
        h("div", { class: "small muted", style: { textAlign: "center" } }, left >= 0
          ? tr(`noch ${relDays(left).replace("in ", "")}`, left > 1 ? `${relDays(left).replace("in ", "")} left` : left === 1 ? "1 day left" : "ends today")
          : tr("abgelaufen", "expired"))),
      h("ol", { class: "milestones" }, steps),
      props([
        [tr("Laufzeit", "Term"), `${fmtDate(c.startsOn)} – ${fmtDate(c.endsOn)}`],
        [tr("Kündigung", "Notice"), c.noticeDeadline ? h("span", {}, noticePeriod(c.notice), h("span", { class: "sub" }, `${tr("spätestens", "by")} ${fmtDate(c.noticeDeadline)}`)) : tr("keine Frist", "no notice period")],
        [tr("Verlängerung", "Renewal"), c.renewal.automatic ? tr(`automatisch um ${c.renewal.months} Monate`, `automatically by ${c.renewal.months} months`) : tr("keine automatische", "not automatic")],
        [tr("Verantwortlich", "Owner"), c.owner],
        c.related.tickets.length ? ["Tickets", h("span", { class: "mono" }, c.related.tickets.join(", "))] : null,
        c.related.deals.length ? [tr("Chancen", "Opportunities"), h("span", { class: "mono" }, c.related.deals.join(", "))] : null,
      ])),
    c.summary ? h("p", { class: "term-summary muted" }, c.summary) : null,
  );
}

const noticePeriod = (n) => n.weeks
  ? tr(`${n.weeks} Wochen zum Ende`, `${n.weeks} weeks before the end`)
  : tr(`${n.months} Monat${n.months > 1 ? "e" : ""} zum Ende`, `${n.months} month${n.months > 1 ? "s" : ""} before the end`);

function clause(c, cl) {
  const labels = TAGS();
  const tags = cl.tags.filter((t) => labels[t]).map((t) => labels[t]);
  const node = h("article", { class: ["clause", cl.important && "open"] },
    h("button", { class: "clause-head", type: "button", "aria-expanded": String(Boolean(cl.important)), onclick: () => {
      node.classList.toggle("open");
      node.querySelector(".clause-head").setAttribute("aria-expanded", String(node.classList.contains("open")));
    } },
      h("span", { class: "num mono faint" }, cl.number),
      h("span", { class: "grow heading" }, cl.heading),
      tags.length ? h("span", { class: "tags small faint" }, tags.join(" · ")) : null,
      icon("chevronRight", 14)),
    h("div", { class: "clause-body" },
      h("p", { class: "clause-text" }, cl.text),
      h("div", { class: "row" },
        h("button", { class: "btn ghost sm", type: "button", disabled: !app.can.chat, onclick: () =>
          app.ask(tr(`Erkläre ${cl.number} „${cl.heading}“ aus Vertrag ${c.number} (${c.id}) in einfachen Worten und sag, was daraus für uns folgt. Zitiere den Wortlaut.`,
            `Explain ${cl.number} "${cl.heading}" of contract ${c.number} (${c.id}) in plain words and say what it means for us. Quote the wording.`)) },
          icon("quote"), tr("Im Chat erklären lassen", "Explain in chat")),
        h("button", { class: "btn ghost sm", type: "button", disabled: !app.can.context, onclick: () =>
          app.context({ contract: c.number, contractId: c.id, clause: cl.number, heading: cl.heading, text: cl.text }, tr(`${cl.number} ist jetzt im Kontext des Chats.`, `${cl.number} is now in the chat context.`)) },
          icon("pin"), tr("Als Kontext merken", "Keep as context")))),
  );
  return node;
}

// Last, so every helper above is initialised before the first result renders.
app = await kit.start({
  render: (data, host) => {
    app = host;
    return data.mode === "dossier" ? dossier(data) : portfolio(data);
  },
  title: { de: "Verträge", en: "Contracts" },
});
