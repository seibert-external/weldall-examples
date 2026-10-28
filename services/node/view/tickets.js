// Ticket view: a ticket with its SLA clock and history, and the open tickets
// grouped by status for a list result.
const kit = await import(new URL(`./kit.js${new URL(import.meta.url).search}`, import.meta.url).href);
const { h, icon, pill, stat, props, ring, reveal, fmtDateTime, relTime, menu, empty, ics } = kit;

// Type tells by icon, not colour. Colour marks critical and high priority, SLA
// risk and done; the ticket in progress carries the accent.
const TYPE = { "Störung": "zap", Wartung: "wrench", Serviceanfrage: "chat", Reklamation: "flag", "IT-Anfrage": "bug" };
const PRIORITY = { Kritisch: ["alert", "danger"], Hoch: ["arrowUp", "warning"], Mittel: ["minus", null], Niedrig: ["arrowDown", null] };
const STATUS = { Offen: null, "In Arbeit": "accent", "Wartet auf Kunde": null, Geplant: null, Erledigt: "success" };
const ORDER = ["In Arbeit", "Offen", "Wartet auf Kunde", "Geplant"];
const SLA_TONE = { breached: "danger", "due-soon": "warning", running: null };

let list = null;
let app;

async function openTicket(key) {
  const data = await app.call("get_ticket", { key });
  if (data) app.show(data);
}

const inform = (t) => app.ask(`Entwirf eine Statusmeldung an ${t.reporter} (${t.customer}) zu Ticket ${t.key}. Sachlich, Sie-Form, ohne interne Notizen. Nenne den nächsten Schritt und die Zeit.`);

function duration(minutes) {
  const abs = Math.abs(minutes);
  if (abs < 60) return `${abs} Min.`;
  if (abs < 48 * 60) return `${Math.floor(abs / 60)} Std.${abs % 60 ? ` ${abs % 60} Min.` : ""}`;
  return `${Math.round(abs / 1440)} Tage`;
}

// Compact for the ring: "3:40 h", "45 min".
const clock = (minutes) => {
  const abs = Math.abs(minutes);
  return abs < 60 ? `${abs} min` : `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")} h`;
};

function slaUsed(t, now) {
  const s = t.slaState;
  const start = Date.parse(s.clock === "Reaktion" ? t.created : t.sla.respondedAt ?? t.created);
  return Math.min(1, Math.max(0, (Date.parse(now) - start) / Math.max(1, Date.parse(s.due) - start)));
}

function slaText(t) {
  const s = t.slaState;
  if (!s) return t.status === "Wartet auf Kunde" && t.sla ? "SLA pausiert" : t.status === "Erledigt" ? "erledigt" : "ohne SLA";
  return s.state === "breached" ? `${s.clock} überschritten seit ${duration(s.minutesLeft)}` : `${s.clock}: noch ${duration(s.minutesLeft)}`;
}

function ticketMenu(t) {
  return menu([
    { label: "Ticket öffnen", icon: "file", disabled: !app.can.call, run: () => openTicket(t.key) },
    { label: "Einsatz in den Kalender", icon: "calendar", disabled: !app.can.download || !t.visit, run: () =>
      app.download(`einsatz-${t.key}.ics`, "text/calendar", ics({
        uid: `${t.key}-visit`, title: `Einsatz ${t.key}: ${t.customer ?? ""}`, at: t.visit.at,
        description: `${t.summary}\nAnlage: ${t.asset ?? "–"}\nTechnik: ${t.visit.technician}`,
      })) },
    "-",
    { label: "Antwort an den Kunden entwerfen", icon: "mail", disabled: !app.can.chat || !t.customer, run: () => inform(t) },
    { label: "Eskalation vorbereiten", icon: "alert", disabled: !app.can.chat, run: () =>
      app.ask(`Bereite eine Eskalation zu Ticket ${t.key} vor: Lage, SLA-Risiko, Vertragsfolgen (Gutschrift oder Vertragsstrafe laut Vertrag ${t.contractId ?? "–"}) und wer was bis wann tun muss.`) },
  ]);
}

// --- One ticket --------------------------------------------------------------
function ticket(data) {
  const t = data.item;
  const s = t.slaState;
  const slaTone = s ? SLA_TONE[s.state] : null;
  const [prioIcon, prioTone] = PRIORITY[t.priority];
  return reveal(h("div", { class: "wrap" },
    list && app.can.call ? h("button", { class: "btn ghost sm back", type: "button", onclick: () => app.show(list) }, icon("arrowLeft"), "Alle Tickets") : null,
    h("header", { class: "hero t-hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, h("span", { class: "mono" }, t.key), ` · ${t.type} · erstellt ${relTime(t.created, new Date(data.now))}`),
        h("h1", { class: "title" }, t.summary),
        h("p", { class: "subtitle" }, `${t.customer ?? "intern"} · gemeldet von ${t.reporter}`),
        h("div", { class: "row pills" },
          pill(t.status, STATUS[t.status]),
          pill(t.priority, prioTone, prioIcon),
          t.labels.length ? h("span", { class: "small faint" }, t.labels.join(" · ")) : null)),
      s ? h("div", { class: "sla-clock" },
        ring(slaUsed(t, data.now), { size: 116, stroke: 9, tone: slaTone ?? "success", children: [
          h("strong", { class: ["num", slaTone && `t-${slaTone}`] }, `${s.state === "breached" ? "+" : ""}${clock(s.minutesLeft)}`),
          h("span", {}, s.state === "breached" ? "überfällig" : "verbleibend")] }),
        h("div", { class: "sla-caption small" }, h("strong", {}, `${s.clock}szeit`), h("span", { class: "muted" }, ` fällig ${fmtDateTime(s.due)}`),
          t.sla.respondedAt && s.clock !== "Reaktion" ? h("div", { class: "faint" }, `Reaktion eingehalten ${fmtDateTime(t.sla.respondedAt)}`) : null)) : null),
    h("div", { class: "split" },
      h("section", { class: "panel" },
        h("div", { class: "panel-body" },
          h("div", { class: "eyebrow" }, "Beschreibung"),
          h("p", { class: "desc" }, t.description)),
        h("div", { class: "panel-head feed-head" }, h("h2", { class: "h2 grow" }, "Verlauf"), h("span", { class: "small faint" }, `${t.history.length} Einträge`)),
        h("div", { class: "panel-body" }, h("ol", { class: "events" }, [...t.history].reverse().map((e) => event(e, data.now))))),
      h("aside", { class: "panel" }, h("div", { class: "panel-body" }, props([
        ["Bearbeitung", t.assignee ?? h("span", { class: "t-warning" }, "nicht zugewiesen")],
        ["Gemeldet von", h("span", {}, t.reporter, h("span", { class: "sub" }, t.customer ?? "intern"))],
        t.asset ? ["Anlage", t.asset] : null,
        t.contractId ? ["Vertrag", h("span", { class: "mono" }, t.contractId)] : null,
        t.visit ? ["Einsatz", h("span", {}, fmtDateTime(t.visit.at), h("span", { class: "sub" }, t.visit.technician))] : null,
        ["Aktualisiert", relTime(t.updated, new Date(data.now))],
      ])))),
    h("div", { class: "actions" },
      h("button", { class: "btn primary", type: "button", disabled: !app.can.chat || !t.customer, onclick: () => inform(t) }, icon("mail"), "Kunden informieren"),
      h("button", { class: "btn", type: "button", disabled: !app.can.chat, onclick: () =>
        app.ask(`Was steht im Vertrag ${t.contractId ?? "des Kunden"} zu Reaktionszeit, Gutschrift und Haftung, und was bedeutet das für Ticket ${t.key}?`) }, icon("scale"), "Vertrag prüfen"),
      h("span", { class: "grow" }), ticketMenu(t)),
  ));
}

function event(e, now) {
  const when = h("span", { class: "faint", title: fmtDateTime(e.at) }, relTime(e.at, new Date(now)));
  if (e.kind === "comment")
    return h("li", { class: ["event", e.internal && "internal"] },
      h("div", { class: "row small" }, h("strong", {}, e.author), e.internal ? h("span", { class: "internal-tag" }, icon("shield", 12), "intern") : null, h("span", { class: "grow" }), when),
      h("p", {}, e.text));
  const text = e.kind === "status" ? [`setzt Status ${e.from} → `, h("strong", {}, e.to)]
    : e.kind === "assign" ? ["weist zu an ", h("strong", {}, e.to)] : ["erstellt das Ticket"];
  return h("li", { class: "event change" }, h("div", { class: "row small" }, h("span", { class: "muted" }, h("strong", {}, e.author), " ", ...text), h("span", { class: "grow" }), when));
}

// --- Ticket list -------------------------------------------------------------------
function board(data) {
  list = data;
  const items = data.items;
  if (!items.length) return empty("checkCircle", "Keine Tickets für diese Auswahl.");
  const open = items.filter((t) => t.status !== "Erledigt");
  const done = items.filter((t) => t.status === "Erledigt");
  const risk = open.filter((t) => t.slaState && t.slaState.state !== "running");
  const breached = open.filter((t) => t.slaState?.state === "breached");
  return reveal(h("div", { class: "wrap" },
    h("header", { class: "hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, "Service-Tickets"),
        h("h1", { class: "title" }, `${open.length} offene Tickets, ${risk.length} mit SLA-Risiko`),
        h("p", { class: "subtitle" }, `${open.filter((t) => t.visit).length} Einsätze geplant · ${open.filter((t) => !t.assignee).length} nicht zugewiesen`)),
      h("div", { class: "hero-figure" },
        h("div", { class: ["figure", breached.length && "t-danger"] }, breached.length),
        h("div", { class: "figure-label" }, "SLA verletzt"))),
    h("div", { class: "stats" },
      stat(open.length, "offen"),
      stat(open.filter((t) => t.priority === "Kritisch" || t.priority === "Hoch").length, "kritisch oder hoch"),
      stat(risk.length, "SLA gefährdet", risk.length ? "warning" : null),
      stat(done.length, "erledigt")),
    h("section", { class: "list" },
      ORDER.map((status) => {
        const group = open.filter((t) => t.status === status);
        return group.length ? [h("div", { class: "group-head" }, h("span", { class: "eyebrow" }, status), h("span", { class: "small faint" }, group.length)),
          group.map((t) => row(t, data.now))] : null;
      }),
      done.length ? h("details", { class: "more" }, h("summary", {}, icon("chevronRight", 14), `Erledigt (${done.length})`), done.map((t) => row(t, data.now))) : null)));
}

function row(t, now) {
  const s = t.slaState;
  const tone = s ? SLA_TONE[s.state] : null;
  const [prioIcon, prioTone] = PRIORITY[t.priority];
  return h("article", { class: ["item", "t-item", (t.priority === "Kritisch" || tone === "danger") && t.status !== "Erledigt" ? "s-danger" : tone === "warning" ? "s-warning" : null], tabindex: 0,
    onclick: (e) => { if (!e.target.closest(".menu")) openTicket(t.key); },
    onkeydown: (e) => { if (e.key === "Enter") openTicket(t.key); } },
    s ? h("span", { class: "t-ring", title: slaText(t) }, ring(slaUsed(t, now), { size: 34, stroke: 4, tone: tone ?? "success", children: icon(TYPE[t.type] ?? "file", 14) }))
      : h("span", { class: "t-type", title: t.type }, icon(TYPE[t.type] ?? "file", 15)),
    h("div", { class: "grow" },
      h("div", { class: "item-title ellipsis" }, t.summary),
      h("div", { class: "item-sub ellipsis" }, h("span", { class: "mono" }, t.key), ` · ${t.customer ?? "intern"}`)),
    h("div", { class: "t-when" },
      h("div", { class: ["small", tone && `t-${tone}`] }, slaText(t)),
      h("div", { class: ["small", prioTone ? `t-${prioTone}` : "faint", "prio"] }, icon(prioIcon, 12), t.priority, t.visit && t.status !== "Erledigt" ? h("span", { class: "faint" }, ` · Einsatz ${fmtDateTime(t.visit.at)}`) : null)),
    h("div", { class: "end t-who small" }, t.assignee ?? h("span", { class: "t-warning" }, "offen")),
    ticketMenu(t));
}

app = await kit.start({
  render: (data, host) => {
    app = host;
    return data.mode === "ticket" ? ticket(data) : board(data);
  },
});
