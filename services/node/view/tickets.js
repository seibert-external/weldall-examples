// Ticket view: a ticket with its SLA clock and history, and the open tickets
// grouped by status for a list result.
const kit = await import(new URL(`./kit.js${new URL(import.meta.url).search}`, import.meta.url).href);
const { h, icon, pill, stat, props, ring, reveal, fmtDateTime, relTime, menu, empty, ics, tr } = kit;

// Type tells by icon, not colour. Colour marks critical and high priority, SLA
// risk and done; the ticket in progress carries the accent.
const TYPE = { "Störung": "zap", Wartung: "wrench", Serviceanfrage: "chat", Reklamation: "flag", "IT-Anfrage": "bug" };
const PRIORITY = { Kritisch: ["alert", "danger"], Hoch: ["arrowUp", "warning"], Mittel: ["minus", null], Niedrig: ["arrowDown", null] };
const STATUS = { Offen: null, "In Arbeit": "accent", "Wartet auf Kunde": null, Geplant: null, Erledigt: "success" };
const ORDER = ["In Arbeit", "Offen", "Wartet auf Kunde", "Geplant"];
const SLA_TONE = { breached: "danger", "due-soon": "warning", running: null };
// Type, status and priority arrive as German codes in both languages.
const LABEL = {
  Kritisch: "Critical", Hoch: "High", Mittel: "Medium", Niedrig: "Low",
  Offen: "Open", "In Arbeit": "In progress", "Wartet auf Kunde": "Waiting for customer", Geplant: "Scheduled", Erledigt: "Done",
  "Störung": "Incident", Wartung: "Maintenance", Serviceanfrage: "Service request", Reklamation: "Complaint", "IT-Anfrage": "IT request",
};
const label = (code) => tr(code, LABEL[code] ?? code);

let list = null;
let app;

async function openTicket(key) {
  const data = await app.call("get_ticket", { key, language: tr("de", "en") });
  if (data) app.show(data);
}

const inform = (t) => app.ask(tr(
  `Entwirf eine Statusmeldung an ${t.reporter} (${t.customer}) zu Ticket ${t.key}. Sachlich, Sie-Form, ohne interne Notizen. Nenne den nächsten Schritt und die Zeit.`,
  `Draft a status update to ${t.reporter} (${t.customer}) on ticket ${t.key}. Factual and formal, no internal notes. Name the next step and the time.`));

function duration(minutes) {
  const abs = Math.abs(minutes);
  if (abs < 60) return tr(`${abs} Min.`, `${abs} min`);
  if (abs < 48 * 60) return tr(`${Math.floor(abs / 60)} Std.${abs % 60 ? ` ${abs % 60} Min.` : ""}`, `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ""}`);
  return tr(`${Math.round(abs / 1440)} Tage`, `${Math.round(abs / 1440)} days`);
}

// Compact for the ring: "3:40 h", "45 min".
const clock = (minutes) => {
  const abs = Math.abs(minutes);
  return abs < 60 ? `${abs} min` : `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")} h`;
};

function slaUsed(t, now) {
  const s = t.slaState;
  // The response clock runs until the first response, the restoration clock from then on.
  const start = Date.parse(t.sla.respondedAt ?? t.created);
  return Math.min(1, Math.max(0, (Date.parse(now) - start) / Math.max(1, Date.parse(s.due) - start)));
}

function slaText(t) {
  const s = t.slaState;
  if (!s) return t.status === "Wartet auf Kunde" && t.sla ? tr("SLA pausiert", "SLA paused") : t.status === "Erledigt" ? tr("erledigt", "done") : tr("ohne SLA", "no SLA");
  return s.state === "breached"
    ? tr(`${s.clock} überschritten seit ${duration(s.minutesLeft)}`, `${s.clock} breached ${duration(s.minutesLeft)} ago`)
    : tr(`${s.clock}: noch ${duration(s.minutesLeft)}`, `${s.clock}: ${duration(s.minutesLeft)} left`);
}

function ticketMenu(t) {
  return menu([
    { label: tr("Ticket öffnen", "Open ticket"), icon: "file", disabled: !app.can.call, run: () => openTicket(t.key) },
    { label: tr("Einsatz in den Kalender", "Add visit to calendar"), icon: "calendar", disabled: !app.can.download || !t.visit, run: () =>
      app.download(tr(`einsatz-${t.key}.ics`, `visit-${t.key}.ics`), "text/calendar", ics({
        uid: `${t.key}-visit`, title: tr(`Einsatz ${t.key}: ${t.customer ?? ""}`, `Visit ${t.key}: ${t.customer ?? ""}`), at: t.visit.at,
        description: tr(`${t.summary}\nAnlage: ${t.asset ?? "–"}\nTechnik: ${t.visit.technician}`, `${t.summary}\nAsset: ${t.asset ?? "–"}\nTechnician: ${t.visit.technician}`),
      })) },
    "-",
    { label: tr("Antwort an den Kunden entwerfen", "Draft a reply to the customer"), icon: "mail", disabled: !app.can.chat || !t.customer, run: () => inform(t) },
    { label: tr("Eskalation vorbereiten", "Prepare an escalation"), icon: "alert", disabled: !app.can.chat, run: () =>
      app.ask(tr(
        `Bereite eine Eskalation zu Ticket ${t.key} vor: Lage, SLA-Risiko, Vertragsfolgen (Gutschrift oder Vertragsstrafe laut Vertrag ${t.contractId ?? "–"}) und wer was bis wann tun muss.`,
        `Prepare an escalation for ticket ${t.key}: situation, SLA risk, contractual consequences (credit or penalty under contract ${t.contractId ?? "–"}) and who has to do what by when.`)) },
  ]);
}

// --- One ticket --------------------------------------------------------------
function ticket(data) {
  const t = data.item;
  const s = t.slaState;
  const slaTone = s ? SLA_TONE[s.state] : null;
  const [prioIcon, prioTone] = PRIORITY[t.priority];
  return reveal(h("div", { class: "wrap" },
    list && app.can.call ? h("button", { class: "btn ghost sm back", type: "button", onclick: () => app.show(list) }, icon("arrowLeft"), tr("Alle Tickets", "All tickets")) : null,
    h("header", { class: "hero t-hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, h("span", { class: "mono" }, t.key), ` · ${label(t.type)} · ${tr("erstellt", "created")} ${relTime(t.created, new Date(data.now))}`),
        h("h1", { class: "title" }, t.summary),
        h("p", { class: "subtitle" }, `${t.customer ?? tr("intern", "internal")} · ${tr("gemeldet von", "reported by")} ${t.reporter}`),
        h("div", { class: "row pills" },
          pill(label(t.status), STATUS[t.status]),
          pill(label(t.priority), prioTone, prioIcon),
          t.labels.length ? h("span", { class: "small faint" }, t.labels.join(" · ")) : null)),
      s ? h("div", { class: "sla-clock" },
        ring(slaUsed(t, data.now), { size: 116, stroke: 9, tone: slaTone ?? "success", children: [
          h("strong", { class: ["num", slaTone && `t-${slaTone}`] }, `${s.state === "breached" ? "+" : ""}${clock(s.minutesLeft)}`),
          h("span", {}, s.state === "breached" ? tr("überfällig", "overdue") : tr("verbleibend", "left"))] }),
        h("div", { class: "sla-caption small" }, h("strong", {}, tr(`${s.clock}szeit`, `${s.clock} time`)), h("span", { class: "muted" }, ` ${tr("fällig", "due")} ${fmtDateTime(s.due)}`),
          t.sla.respondedAt ? h("div", { class: "faint" }, `${tr("Reaktion eingehalten", "Response met")} ${fmtDateTime(t.sla.respondedAt)}`) : null)) : null),
    h("div", { class: "split" },
      h("section", { class: "panel" },
        h("div", { class: "panel-body" },
          h("div", { class: "eyebrow" }, tr("Beschreibung", "Description")),
          h("p", { class: "desc" }, t.description)),
        h("div", { class: "panel-head feed-head" }, h("h2", { class: "h2 grow" }, tr("Verlauf", "History")), h("span", { class: "small faint" }, tr(`${t.history.length} Einträge`, `${t.history.length} entries`))),
        h("div", { class: "panel-body" }, h("ol", { class: "events" }, [...t.history].reverse().map((e) => event(e, data.now))))),
      h("aside", { class: "panel" }, h("div", { class: "panel-body" }, props([
        [tr("Bearbeitung", "Assignee"), t.assignee ?? h("span", { class: "t-warning" }, tr("nicht zugewiesen", "unassigned"))],
        [tr("Gemeldet von", "Reported by"), h("span", {}, t.reporter, h("span", { class: "sub" }, t.customer ?? tr("intern", "internal")))],
        t.asset ? [tr("Anlage", "Asset"), t.asset] : null,
        t.contractId ? [tr("Vertrag", "Contract"), h("span", { class: "mono" }, t.contractId)] : null,
        t.visit ? [tr("Einsatz", "Visit"), h("span", {}, fmtDateTime(t.visit.at), h("span", { class: "sub" }, t.visit.technician))] : null,
        [tr("Aktualisiert", "Updated"), relTime(t.updated, new Date(data.now))],
      ])))),
    h("div", { class: "actions" },
      h("button", { class: "btn primary", type: "button", disabled: !app.can.chat || !t.customer, onclick: () => inform(t) }, icon("mail"), tr("Kunden informieren", "Inform customer")),
      h("button", { class: "btn", type: "button", disabled: !app.can.chat, onclick: () =>
        app.ask(tr(
          `Was steht im Vertrag ${t.contractId ?? "des Kunden"} zu Reaktionszeit, Gutschrift und Haftung, und was bedeutet das für Ticket ${t.key}?`,
          `What does ${t.contractId ? `contract ${t.contractId}` : "the customer's contract"} say about response time, credits and liability, and what does that mean for ticket ${t.key}?`)) },
        icon("scale"), tr("Vertrag prüfen", "Check contract")),
      h("span", { class: "grow" }), ticketMenu(t)),
  ));
}

function event(e, now) {
  const when = h("span", { class: "faint", title: fmtDateTime(e.at) }, relTime(e.at, new Date(now)));
  if (e.kind === "comment")
    return h("li", { class: ["event", e.internal && "internal"] },
      h("div", { class: "row small" }, h("strong", {}, e.author), e.internal ? h("span", { class: "internal-tag" }, icon("shield", 12), tr("intern", "internal")) : null, h("span", { class: "grow" }), when),
      h("p", {}, e.text));
  const text = e.kind === "status" ? [tr(`setzt Status ${e.from} → `, `sets status ${label(e.from)} → `), h("strong", {}, label(e.to))]
    : e.kind === "assign" ? [tr("weist zu an ", "assigns to "), h("strong", {}, e.to)] : [tr("erstellt das Ticket", "creates the ticket")];
  return h("li", { class: "event change" }, h("div", { class: "row small" }, h("span", { class: "muted" }, h("strong", {}, e.author), " ", ...text), h("span", { class: "grow" }), when));
}

// --- Ticket list -------------------------------------------------------------------
function board(data) {
  list = data;
  const items = data.items;
  if (!items.length) return empty("checkCircle", tr("Keine Tickets für diese Auswahl.", "No tickets for this selection."));
  const open = items.filter((t) => t.status !== "Erledigt");
  const done = items.filter((t) => t.status === "Erledigt");
  const risk = open.filter((t) => t.slaState && t.slaState.state !== "running");
  const breached = open.filter((t) => t.slaState?.state === "breached");
  return reveal(h("div", { class: "wrap" },
    h("header", { class: "hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, tr("Service-Tickets", "Service tickets")),
        h("h1", { class: "title" }, tr(`${open.length} offene Tickets, ${risk.length} mit SLA-Risiko`, `${open.length} open tickets, ${risk.length} with SLA risk`)),
        h("p", { class: "subtitle" }, tr(`${open.filter((t) => t.visit).length} Einsätze geplant · ${open.filter((t) => !t.assignee).length} nicht zugewiesen`,
          `${open.filter((t) => t.visit).length} visits scheduled · ${open.filter((t) => !t.assignee).length} unassigned`))),
      h("div", { class: "hero-figure" },
        h("div", { class: ["figure", breached.length && "t-danger"] }, breached.length),
        h("div", { class: "figure-label" }, tr("SLA verletzt", "SLA breached")))),
    h("div", { class: "stats" },
      stat(open.length, tr("offen", "open")),
      stat(open.filter((t) => t.priority === "Kritisch" || t.priority === "Hoch").length, tr("kritisch oder hoch", "critical or high")),
      stat(risk.length, tr("SLA gefährdet", "SLA at risk"), risk.length ? "warning" : null),
      stat(done.length, tr("erledigt", "done"))),
    h("section", { class: "list" },
      ORDER.map((status) => {
        const group = open.filter((t) => t.status === status);
        return group.length ? [h("div", { class: "group-head" }, h("span", { class: "eyebrow" }, label(status)), h("span", { class: "small faint" }, group.length)),
          group.map((t) => row(t, data.now))] : null;
      }),
      done.length ? h("details", { class: "more" }, h("summary", {}, icon("chevronRight", 14), `${label("Erledigt")} (${done.length})`), done.map((t) => row(t, data.now))) : null)));
}

function row(t, now) {
  const s = t.slaState;
  const tone = s ? SLA_TONE[s.state] : null;
  const [prioIcon, prioTone] = PRIORITY[t.priority];
  return h("article", { class: ["item", "t-item", (t.priority === "Kritisch" || tone === "danger") && t.status !== "Erledigt" ? "s-danger" : tone === "warning" ? "s-warning" : null], tabindex: 0,
    onclick: (e) => { if (!e.target.closest(".menu")) openTicket(t.key); },
    onkeydown: (e) => { if (e.key === "Enter") openTicket(t.key); } },
    s ? h("span", { class: "t-ring", title: slaText(t) }, ring(slaUsed(t, now), { size: 34, stroke: 4, tone: tone ?? "success", children: icon(TYPE[t.type] ?? "file", 14) }))
      : h("span", { class: "t-type", title: label(t.type) }, icon(TYPE[t.type] ?? "file", 15)),
    h("div", { class: "grow" },
      h("div", { class: "item-title ellipsis" }, t.summary),
      h("div", { class: "item-sub ellipsis" }, h("span", { class: "mono" }, t.key), ` · ${t.customer ?? tr("intern", "internal")}`)),
    h("div", { class: "t-when" },
      h("div", { class: ["small", tone && `t-${tone}`] }, slaText(t)),
      h("div", { class: ["small", prioTone ? `t-${prioTone}` : "faint", "prio"] }, icon(prioIcon, 12), label(t.priority), t.visit && t.status !== "Erledigt" ? h("span", { class: "faint" }, ` · ${tr("Einsatz", "Visit")} ${fmtDateTime(t.visit.at)}`) : null)),
    h("div", { class: "end t-who small" }, t.assignee ?? h("span", { class: "t-warning" }, tr("offen", "unassigned"))),
    ticketMenu(t));
}

app = await kit.start({
  title: { de: "Service-Tickets", en: "Service tickets" },
  render: (data, host) => {
    app = host;
    return data.mode === "ticket" ? ticket(data) : board(data);
  },
});
