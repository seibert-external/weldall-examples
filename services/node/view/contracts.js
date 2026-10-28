// Contract view: a deadline radar for a list result, a dossier for one contract.
const kit = await import(new URL(`./kit.js${new URL(import.meta.url).search}`, import.meta.url).href);
const { h, icon, stat, props, ring, reveal, fmtDate, fmtMonth, fmtMoney, relDays, daysBetween, menu, empty, ics } = kit;

// Colour only where a deadline needs action: red within two weeks, amber within
// sixty days or after a missed notice. Everything else stays neutral.
const TONE = { critical: "danger", soon: "warning", missed: "warning" };
const STATUS = { active: "Laufend", draft: "Entwurf", expired: "Beendet" };
const TAGS = { frist: "Frist", preis: "Preis", haftung: "Haftung", sla: "SLA", datenschutz: "Datenschutz", abnahme: "Abnahme" };
const HORIZON = 180;

let lastList = null;
let app;

async function open(id) {
  const data = await app.call("get_contract", { id });
  if (data) app.show(data);
}

const money = (value) => fmtMoney(value, "EUR", true);
const perYear = (c) => (c.valueBasis === "jährlich" ? " / Jahr" : c.valueBasis === "Abrufvolumen" ? " Abruf" : "");
const valueLabel = (c) => (c.value === 0 ? "kostenfrei" : `${fmtMoney(c.value, c.currency, true)}${perYear(c)}`);
const addDays = (iso, days) => new Date(Date.parse(`${iso}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const dayTone = (days) => (days <= 14 ? "danger" : days <= 60 ? "warning" : null);

function calendarFile(c, d) {
  return app.download(`frist-${c.number}.ics`, "text/calendar", ics({
    uid: `${c.id}-${d.date}`, title: `${d.label}: ${c.title}`, date: d.date,
    description: `${c.number} · ${c.counterparty}\n${c.situation}\nVerantwortlich: ${c.owner}`,
  }));
}

function actions(c) {
  const d = c.nextDeadline;
  return menu([
    { label: "Dossier öffnen", icon: "file", disabled: !app.can.call, run: () => open(c.id) },
    { label: "Frist in den Kalender", icon: "calendar", disabled: !app.can.download || !d, run: () => calendarFile(c, d) },
    "-",
    { label: c.direction === "customer" ? "Verlängerungsangebot vorbereiten" : "Kündigung entwerfen", icon: "sparkles", disabled: !app.can.chat, run: () =>
      app.ask(c.direction === "customer"
        ? `Bereite für ${c.counterparty} ein Verlängerungsangebot zu Vertrag ${c.number} (${c.id}) vor. Berücksichtige Preisanpassungsklausel, offene Tickets und Chancen im CRM.`
        : `Entwirf eine fristgerechte Kündigung von Vertrag ${c.number} (${c.id}) gegenüber ${c.counterparty}. Nenne Frist und Zugangsweg und prüfe, ob eine Verhandlung sinnvoller ist.`) },
    { label: "Im Chat besprechen", icon: "chat", disabled: !app.can.chat, run: () =>
      app.ask(`Fasse Vertrag ${c.number} (${c.id}) mit ${c.counterparty} zusammen: Fristen, Risiken und was ich jetzt tun sollte.`) },
  ]);
}

// --- Radar ---------------------------------------------------------------------
function portfolio(data) {
  lastList = data;
  const items = data.items;
  if (!items.length) return empty("file", "Keine Verträge für diese Auswahl.");
  const running = items.filter((c) => c.status === "active");
  const dated = running.filter((c) => c.nextDeadline && c.urgency !== "missed").sort((a, b) => a.nextDeadline.date.localeCompare(b.nextDeadline.date));
  const urgent = running.filter((c) => c.urgency === "critical" || c.urgency === "soon");
  const missed = running.filter((c) => c.urgency === "missed");
  const yearly = running.filter((c) => c.valueBasis === "jährlich").reduce((sum, c) => sum + c.value, 0);
  const atStake = urgent.filter((c) => c.valueBasis === "jährlich").reduce((sum, c) => sum + c.value, 0);
  const first = dated[0];
  const rest = items.filter((c) => !dated.includes(c) && !missed.includes(c));

  return reveal(h("div", { class: "wrap" },
    h("header", { class: "hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, "Vertragsregister"),
        h("h1", { class: "title" }, `${urgent.length} Fristen in den nächsten 60 Tagen`),
        h("p", { class: "subtitle" }, `${running.length} laufende Verträge · ${money(yearly)} Jahreswert`)),
      first ? h("div", { class: "hero-figure" },
        h("div", { class: ["figure", dayTone(first.nextDeadline.days) && `t-${dayTone(first.nextDeadline.days)}`] },
          first.nextDeadline.days, h("small", {}, first.nextDeadline.days === 1 ? "Tag" : "Tage")),
        h("div", { class: "figure-label" }, `bis ${first.nextDeadline.label} · ${first.counterparty.replace(/ (GmbH|AG|KG|GbR)$/, "")}`)) : null),
    h("div", { class: "stats" },
      stat(running.length, "laufende Verträge"),
      stat(urgent.length, "Fristen ≤ 60 Tage", urgent.length ? "warning" : null),
      stat(money(atStake), "Jahreswert betroffen"),
      stat(missed.length, "automatisch verlängert")),
    radar(data.today, dated),
    h("section", { class: "list", "aria-label": "Fristen nach Monat" }, agenda(dated, missed, rest)),
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
  return h("section", { class: "panel radar", "aria-label": "Fristenradar der nächsten sechs Monate" },
    h("div", { class: "panel-head" }, h("h2", { class: "h2 grow" }, "Fristenradar"), h("span", { class: "small faint" }, "nächste 6 Monate")),
    h("div", { class: "panel-body" },
      h("div", { class: "rd" },
        h("div", { class: "rd-axis" }, h("span"), h("div", { class: "rd-track" },
          windows.map(([from, to, tone]) => h("span", { class: `rd-window ${tone}`, style: { left: `${(from / HORIZON) * 100}%`, width: `${((to - from) / HORIZON) * 100}%` } })),
          h("span", { class: "rd-month today", style: { left: "0%" } }, "Heute"),
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
              h("span", { class: "rd-days num", style: { left: pos(d.date) } }, `${d.days} T`)));
        })),
      h("div", { class: "rd-legend small faint" },
        h("span", {}, h("i", { class: "rd-key danger" }), "≤ 14 Tage"), h("span", {}, h("i", { class: "rd-key warning" }), "≤ 60 Tage"),
        h("span", {}, h("i", { class: "rd-key line" }), "Restlaufzeit danach"))),
  );
}

function agenda(dated, missed, rest) {
  const out = [];
  if (missed.length) {
    out.push(groupHead("Frist verpasst", missed.length));
    out.push(...missed.map((c) => agendaItem(c, c.renewedUntil, "automatisch verlängert bis", "warning")));
  }
  const soon = dated.filter((c) => c.nextDeadline.days <= HORIZON);
  const later = dated.filter((c) => c.nextDeadline.days > HORIZON);
  let month = null;
  for (const c of soon) {
    const key = c.nextDeadline.date.slice(0, 7);
    if (key !== month) {
      month = key;
      const inMonth = soon.filter((x) => x.nextDeadline.date.startsWith(key));
      out.push(groupHead(new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-15T12:00:00Z`)), inMonth.length));
    }
    out.push(agendaItem(c, c.nextDeadline.date, c.nextDeadline.label, TONE[c.urgency]));
  }
  if (later.length) out.push(h("details", { class: "more" }, h("summary", {}, icon("chevronRight", 14), `Später als in 6 Monaten (${later.length})`),
    later.map((c) => agendaItem(c, c.nextDeadline.date, c.nextDeadline.label, null))));
  if (rest.length) out.push(h("details", { class: "more" }, h("summary", {}, icon("chevronRight", 14), `Ohne anstehende Frist (${rest.length})`),
    rest.map((c) => agendaItem(c, c.status === "draft" ? c.startsOn : c.endsOn, c.status === "draft" ? "Entwurf, Beginn" : STATUS[c.status], null))));
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
      h("div", { class: "item-sub ellipsis" }, `${c.counterparty} · ${c.direction === "customer" ? "Kunde" : "Lieferant"} · ${c.number}`)),
    h("div", { class: "c-when" },
      h("div", { class: ["small", tone && `t-${tone}`] }, days !== null ? `${label} ${relDays(days)}` : label),
      h("div", { class: "small faint" }, date ? fmtDate(date, { weekday: "short" }) : "")),
    h("div", { class: "end c-value" }, h("div", { class: "item-title" }, c.value === 0 ? "–" : money(c.value)), h("div", { class: "small faint" }, c.value === 0 ? "kostenfrei" : perYear(c).replace(" / ", "pro ").trim() || "gesamt")),
    actions(c));
}

// --- Dossier -----------------------------------------------------------------
function dossier(data) {
  const c = data.item;
  const tone = TONE[c.urgency];
  const d = c.nextDeadline;
  return reveal(h("div", { class: "wrap" },
    lastList && app.can.call ? h("button", { class: "btn ghost sm back", type: "button", onclick: () => app.show(lastList) }, icon("arrowLeft"), "Alle Verträge") : null,
    h("header", { class: "hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, `${c.number} · ${c.kind}`),
        h("h1", { class: "title" }, c.title),
        h("p", { class: "subtitle" }, c.counterparty, c.counterpartyContact ? ` · ${c.counterpartyContact}` : "")),
      h("div", { class: "hero-figure" },
        h("div", { class: "figure" }, c.value === 0 ? "0 €" : fmtMoney(c.value, c.currency, true), perYear(c) ? h("small", {}, perYear(c).replace(" / ", "/")) : null),
        h("div", { class: "figure-label" }, `netto · ${STATUS[c.status]} · ${c.direction === "customer" ? "Kundenvertrag" : "Lieferantenvertrag"}`))),
    h("div", { class: ["callout", tone] }, icon(tone ? "alert" : "calendar", 18),
      h("div", { class: "lead" }, c.situation),
      d ? h("div", { class: "when" }, relDays(d.days)) : null),
    term(c, data.today),
    h("section", { class: "panel" },
      h("div", { class: "panel-head" }, h("h2", { class: "h2 grow" }, "Klauseln"), h("span", { class: "small faint" }, `${c.clauses.length} Paragrafen`)),
      h("div", { class: "clauses" }, c.clauses.map((cl) => clause(c, cl)))),
    h("div", { class: "actions" },
      h("button", { class: "btn primary", type: "button", disabled: !app.can.chat, onclick: () =>
        app.ask(`Was sollte ich zu Vertrag ${c.number} (${c.id}) mit ${c.counterparty} als Nächstes tun? Berücksichtige Fristen, Preisklausel, offene Tickets und Chancen.`) },
        icon("sparkles"), "Nächste Schritte vorschlagen"),
      d ? h("button", { class: "btn", type: "button", disabled: !app.can.download, onclick: () => calendarFile(c, d) }, icon("calendar"), "Frist in den Kalender") : null,
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
    c.signedOn && { date: c.signedOn, label: "Unterzeichnet" },
    { date: c.startsOn, label: "Vertragsbeginn" },
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
  steps.splice(todayAt < 0 ? steps.length : todayAt, 0, h("li", { class: "ms today" }, h("span", { class: "ms-dot" }), h("span", { class: "ms-label" }, "Heute"), h("span", { class: "ms-date num" }, fmtDate(today)), h("span")));
  return h("section", { class: "panel term" },
    h("div", { class: "panel-body term-body" },
      h("div", { class: "term-ring" },
        ring(elapsed, { size: 128, stroke: 10, children: [h("strong", { class: "num" }, `${Math.round(elapsed * 100)} %`), h("span", {}, "Laufzeit")] }),
        h("div", { class: "small muted", style: { textAlign: "center" } }, left >= 0 ? `noch ${relDays(left).replace("in ", "")}` : "abgelaufen")),
      h("ol", { class: "milestones" }, steps),
      props([
        ["Laufzeit", `${fmtDate(c.startsOn)} – ${fmtDate(c.endsOn)}`],
        ["Kündigung", c.noticeDeadline ? h("span", {}, `${c.notice.weeks ? `${c.notice.weeks} Wochen` : `${c.notice.months} Monat${c.notice.months > 1 ? "e" : ""}`} zum Ende`, h("span", { class: "sub" }, `spätestens ${fmtDate(c.noticeDeadline)}`)) : "keine Frist"],
        ["Verlängerung", c.renewal.automatic ? `automatisch um ${c.renewal.months} Monate` : "keine automatische"],
        ["Verantwortlich", c.owner],
        c.related.tickets.length ? ["Tickets", h("span", { class: "mono" }, c.related.tickets.join(", "))] : null,
        c.related.deals.length ? ["Chancen", h("span", { class: "mono" }, c.related.deals.join(", "))] : null,
      ])),
    c.summary ? h("p", { class: "term-summary muted" }, c.summary) : null,
  );
}

function clause(c, cl) {
  const tags = cl.tags.filter((t) => TAGS[t]).map((t) => TAGS[t]);
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
          app.ask(`Erkläre ${cl.number} „${cl.heading}“ aus Vertrag ${c.number} (${c.id}) in einfachen Worten und sag, was daraus für uns folgt. Zitiere den Wortlaut.`) },
          icon("quote"), "Im Chat erklären lassen"),
        h("button", { class: "btn ghost sm", type: "button", disabled: !app.can.context, onclick: () =>
          app.context({ contract: c.number, contractId: c.id, clause: cl.number, heading: cl.heading, text: cl.text }, `${cl.number} ist jetzt im Kontext des Chats.`) },
          icon("pin"), "Als Kontext merken"))),
  );
  return node;
}

// Last, so every helper above is initialised before the first result renders.
app = await kit.start({
  render: (data, host) => {
    app = host;
    return data.mode === "dossier" ? dossier(data) : portfolio(data);
  },
});
