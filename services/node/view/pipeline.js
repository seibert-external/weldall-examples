// Pipeline view: a funnel and the deals per stage, and a deal detail with the
// customer's contact history.
const kit = await import(new URL(`./kit.js${new URL(import.meta.url).search}`, import.meta.url).href);
const { h, icon, stat, props, ring, reveal, fmtDate, fmtMoney, fmtNumber, relDays, menu, empty, ics, tr } = kit;

const OPEN = ["qualifizierung", "bedarfsanalyse", "angebot", "verhandlung"];
const LABELS = {
  qualifizierung: ["Qualifizierung", "Qualification"], bedarfsanalyse: ["Bedarfsanalyse", "Needs analysis"], angebot: ["Angebot", "Proposal"],
  verhandlung: ["Verhandlung", "Negotiation"], gewonnen: ["Gewonnen", "Won"],
};
const ACTIVITY = { meeting: ["Termin", "Meeting", "users"], call: ["Anruf", "Call", "phone"], email: ["E-Mail", "Email", "mail"], note: ["Notiz", "Note", "note"] };
const STATUS = { customer: ["Bestandskunde", "Customer"], prospect: ["Interessent", "Prospect"], lead: ["Lead", "Lead"], churned: ["Verloren", "Lost"] };
const money = (value) => fmtMoney(value, "EUR", true);
const pct = (value) => tr(`${value} %`, `${value}%`);

let board = null;
let owner = null;
let app;

async function openDeal(id) {
  const data = await app.call("get_deal", { id, language: tr("de", "en") });
  if (data) app.show(data);
}

const prepare = (d) => app.ask(tr(
  `Bereite mich auf das nächste Gespräch mit ${d.organizationName} zur Chance „${d.title}“ (${d.id}) vor. Nutze CRM, Verträge, Tickets und Postfach, soweit verfügbar.`,
  `Prepare me for the next conversation with ${d.organizationName} about the deal "${d.title}" (${d.id}). Use the CRM, contracts, tickets and mailbox where available.`));

function dealMenu(d) {
  return menu([
    { label: tr("Details und Verlauf", "Details and history"), icon: "list", disabled: !app.can.call, run: () => openDeal(d.id) },
    { label: tr("Abschlusstermin in den Kalender", "Add close date to calendar"), icon: "calendar", disabled: !app.can.download, run: () =>
      app.download(tr(`abschluss-${d.id}.ics`, `close-${d.id}.ics`), "text/calendar", ics({
        uid: d.id, title: `${tr("Abschluss", "Close")}: ${d.title}`, date: d.closeDate,
        description: `${d.organizationName} · ${money(d.value)} · ${d.stageLabel}\n${tr("Nächster Schritt", "Next step")}: ${d.nextStep}`,
      })) },
    "-",
    { label: tr("Termin vorbereiten", "Prepare meeting"), icon: "sparkles", disabled: !app.can.chat, run: () => prepare(d) },
    { label: tr("Follow-up-Mail entwerfen", "Draft follow-up email"), icon: "mail", disabled: !app.can.chat, run: () =>
      app.ask(tr(
        `Entwirf eine kurze Follow-up-Mail an ${d.contact?.name ?? "den Ansprechpartner"} (${d.organizationName}) zur Chance „${d.title}“. Nächster Schritt laut CRM: ${d.nextStep}`,
        `Draft a short follow-up email to ${d.contact?.name ?? "the contact"} (${d.organizationName}) about the deal "${d.title}". Next step according to the CRM: ${d.nextStep}`)) },
  ]);
}

// Colour only for what needs action: an overdue or near close date, a deal
// without contact for a month.
function tone(d) {
  if (!d.open) return null;
  if (d.overdue) return "danger";
  if (d.daysToClose <= 14 || d.daysSinceActivity > 30) return "warning";
  return null;
}

function closeText(d) {
  if (!d.open)
    return d.stage === "gewonnen"
      ? tr(`gewonnen am ${fmtDate(d.closeDate)}`, `won on ${fmtDate(d.closeDate)}`)
      : tr(`verloren am ${fmtDate(d.closeDate)}`, `lost on ${fmtDate(d.closeDate)}`);
  if (d.overdue) return tr(`überfällig seit ${-d.daysToClose} Tagen`, `overdue by ${-d.daysToClose} days`);
  return `${tr("Abschluss", "Close")} ${relDays(d.daysToClose)}`;
}

// --- Board -----------------------------------------------------------------------
function pipeline(data) {
  board = data;
  const deals = data.deals.filter((d) => !owner || d.owner === owner);
  const open = deals.filter((d) => d.open);
  const sum = (list, key = "value") => list.reduce((total, d) => total + d[key], 0);
  const attention = open.filter((d) => tone(d));
  const owners = [...new Set(data.deals.map((d) => d.owner))];
  const won = deals.filter((d) => d.stage === "gewonnen" && d.closeDate.slice(0, 4) === data.today.slice(0, 4));
  const lost = deals.filter((d) => d.stage === "verloren");
  const stages = data.stages.filter((s) => s.id !== "verloren");

  return reveal(h("div", { class: "wrap" },
    h("header", { class: "hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, tr("Vertriebspipeline", "Sales pipeline")),
        h("h1", { class: "title" }, tr(`${money(sum(open))} offen in ${open.length} Chancen`, `${money(sum(open))} open in ${open.length} deals`)),
        h("p", { class: "subtitle" }, `${money(sum(open.filter((d) => d.closeDate <= data.totals.quarterEnd)))} ${tr("mit Abschluss bis", "closing by")} ${fmtDate(data.totals.quarterEnd, { year: undefined })}`)),
      h("div", { class: "hero-figure" },
        h("div", { class: "figure" }, money(sum(open, "weightedValue"))),
        h("div", { class: "figure-label" }, tr("gewichteter Forecast", "weighted forecast")))),
    h("div", { class: "stats" },
      stat(open.length, tr("offene Chancen", "open deals")),
      stat(money(sum(won)), `${tr("gewonnen", "won")} ${data.today.slice(0, 4)}`),
      stat(attention.length, tr("brauchen Aufmerksamkeit", "need attention"), attention.length ? "danger" : null),
      stat(pct(Math.round((sum(open, "weightedValue") / Math.max(1, sum(open))) * 100)), tr("Ø Wahrscheinlichkeit", "avg. probability"))),
    h("div", { class: "row filters" },
      h("span", { class: "eyebrow grow" }, tr("Verantwortlich", "Owner")),
      h("div", { class: "segmented", role: "group", "aria-label": tr("Verantwortlich", "Owner") },
        [null, ...owners].map((name) => h("button", {
          type: "button", "aria-pressed": String(owner === name),
          onclick: () => { owner = name; app.show(board); },
        }, name ?? tr("Alle", "All"))))),
    funnel(stages, deals),
    h("section", { class: "list", "aria-label": tr("Chancen nach Phase", "Deals by stage") },
      stages.map((stage) => {
        const inStage = deals.filter((d) => d.stage === stage.id);
        if (!inStage.length) return null;
        return [h("div", { class: "group-head" }, h("span", { class: "eyebrow" }, stage.label), h("span", { class: "small faint" }, `${inStage.length} · ${money(sum(inStage))}`)),
          inStage.map((d) => row(d))];
      }),
      lost.length ? h("details", { class: "more" }, h("summary", {}, icon("chevronRight", 14), `${tr("Verloren", "Lost")} (${lost.length}) · ${money(sum(lost))}`),
        lost.map((d) => row(d))) : null),
  ));
}

// Stage bars sized by value, centred like a funnel; closer to the deal, deeper
// the accent. Won is green, the only status colour here.
function funnel(stages, deals) {
  const values = stages.map((s) => deals.filter((d) => d.stage === s.id).reduce((t, d) => t + d.value, 0));
  const max = Math.max(1, ...values);
  return h("section", { class: "panel funnel", "aria-label": tr("Trichter", "Funnel") },
    h("div", { class: "panel-head" }, h("h2", { class: "h2 grow" }, tr("Trichter", "Funnel")), h("span", { class: "small faint" }, tr("Volumen je Phase", "Value per stage"))),
    h("div", { class: "panel-body fn" }, stages.map((s, i) => {
      const count = deals.filter((d) => d.stage === s.id).length;
      const width = Math.max(6, (values[i] / max) * 100);
      return h("div", { class: "fn-row" },
        h("span", { class: "fn-label" }, s.label),
        h("span", { class: "fn-track" }, h("span", { class: ["fn-bar", `fn-${i}`, s.id === "gewonnen" && "won"], style: { width: `${width}%` } },
          h("span", { class: "fn-value num" }, money(values[i])))),
        h("span", { class: "fn-meta small faint num" }, `${count} · ${pct(OPEN.includes(s.id) ? s.probability : 100)}`));
    })));
}

function row(d) {
  const t = tone(d);
  return h("article", { class: ["item", "p-item", t && `s-${t}`], tabindex: 0,
    onclick: (e) => { if (!e.target.closest(".menu")) openDeal(d.id); },
    onkeydown: (e) => { if (e.key === "Enter") openDeal(d.id); } },
    h("span", { class: "p-ring", title: tr(`${d.probability} % Wahrscheinlichkeit`, `${d.probability}% probability`) },
      ring(d.open ? d.probability / 100 : d.stage === "gewonnen" ? 1 : 0, { size: 34, stroke: 4, tone: d.stage === "gewonnen" ? "success" : null, children: h("span", { class: "p-pct num" }, d.probability) })),
    h("div", { class: "grow" },
      h("div", { class: "item-title ellipsis" }, d.title),
      h("div", { class: "item-sub ellipsis" }, `${d.organizationName} · ${d.source}`)),
    h("div", { class: "p-when" },
      h("div", { class: ["small", t && d.overdue ? "t-danger" : d.open && d.daysToClose <= 14 ? "t-warning" : ""] }, closeText(d)),
      h("div", { class: ["small", d.open && d.daysSinceActivity > 30 ? "t-warning" : "faint"] },
        d.open && d.daysSinceActivity > 30 ? tr(`${d.daysSinceActivity} Tage ohne Kontakt`, `${d.daysSinceActivity} days without contact`) : d.owner)),
    h("div", { class: "end p-value" }, h("div", { class: "item-title" }, money(d.value)), d.open ? h("div", { class: "small faint" }, `${tr("gewichtet", "weighted")} ${money(d.weightedValue)}`) : null),
    dealMenu(d));
}

// --- Deal detail -----------------------------------------------------------------
function detail(data) {
  const { deal: d, organization: o, activities } = data;
  const stages = OPEN.concat("gewonnen");
  const current = stages.indexOf(d.stage);
  const t = tone(d);
  return reveal(h("div", { class: "wrap" },
    board && app.can.call ? h("button", { class: "btn ghost sm back", type: "button", onclick: () => app.show(board) }, icon("arrowLeft"), tr("Zur Pipeline", "Back to pipeline")) : null,
    h("header", { class: "hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, `${o.industry} · ${o.city}`),
        h("h1", { class: "title" }, d.title),
        h("p", { class: "subtitle" }, `${d.organizationName} · ${fmtNumber(o.employees)} ${tr("Mitarbeitende", "employees")}`)),
      h("div", { class: "hero-figure" },
        h("div", { class: "figure" }, money(d.value)),
        h("div", { class: "figure-label" }, d.open ? `${tr("gewichtet", "weighted")} ${money(d.weightedValue)} · ${pct(d.probability)}` : d.stageLabel))),
    h("ol", { class: "stages", "aria-label": tr("Phase", "Stage") }, stages.map((id, i) => h("li", {
      class: [i < current && "done", i === current && "current", d.stage === "verloren" && "lost"],
    }, h("span", { class: "stage-bar" }), h("span", { class: "stage-name" }, tr(...LABELS[id]))))),
    h("div", { class: ["callout", t] }, icon("target", 18),
      h("div", {}, h("div", { class: "eyebrow" }, tr("Nächster Schritt", "Next step")), h("div", { class: "lead" }, d.nextStep)),
      h("div", { class: "when" }, closeText(d))),
    h("div", { class: "split" },
      h("section", { class: "panel" },
        h("div", { class: "panel-head" }, h("h2", { class: "h2 grow" }, tr("Kontaktverlauf", "Contact history")), h("span", { class: "small faint" }, tr(`${activities.length} Einträge`, `${activities.length} entries`))),
        h("div", { class: "panel-body" },
          activities.length ? h("ol", { class: "feed" }, activities.map((a) => {
            const [de, en, iconName] = ACTIVITY[a.type] ?? [a.type, a.type, "note"];
            const label = tr(de, en);
            return h("li", {},
              h("span", { class: "feed-icon" }, icon(iconName, 14)),
              h("div", { class: "grow" },
                h("div", { class: "row small" }, h("strong", {}, label), h("span", { class: "faint" }, `${a.by} · ${relDays(kit.daysBetween(data.today, a.date))}`), h("span", { class: "grow" }), h("span", { class: "faint num" }, fmtDate(a.date))),
                h("p", {}, a.summary)));
          })) : empty("clock", tr("Noch kein Kontakt erfasst.", "No contact recorded yet.")))),
      h("aside", { class: "panel" }, h("div", { class: "panel-body" }, props([
        [tr("Phase", "Stage"), d.stageLabel],
        [tr("Abschluss", "Close"), h("span", {}, fmtDate(d.closeDate), h("span", { class: "sub" }, closeText(d)))],
        [tr("Quelle", "Source"), d.source],
        [tr("Verantwortlich", "Owner"), h("span", {}, d.owner, h("span", { class: "sub" }, "Key Account"))],
        d.contact ? [tr("Kontakt", "Contact"), h("span", {}, d.contact.name, h("span", { class: "sub" }, d.contact.role), h("span", { class: "sub" }, d.contact.email))] : null,
        [tr("Kunde", "Customer"), h("span", {}, tr(...(STATUS[o.status] ?? STATUS.churned)),
          o.contractIds.length ? h("span", { class: "sub" }, tr(`${o.contractIds.length} Verträge`, `${o.contractIds.length} contracts`)) : null)],
      ]), o.notes ? h("p", { class: "side-note small muted" }, o.notes) : null))),
    h("div", { class: "actions" },
      h("button", { class: "btn primary", type: "button", disabled: !app.can.chat, onclick: () => prepare(d) }, icon("sparkles"), tr("Termin vorbereiten", "Prepare meeting")),
      h("button", { class: "btn", type: "button", disabled: !app.can.context, onclick: () =>
        app.context({ deal: d.id, title: d.title, organization: d.organizationName, stage: d.stageLabel, value: d.value, closeDate: d.closeDate, nextStep: d.nextStep }, tr("Die Chance ist jetzt im Kontext des Chats.", "The deal is now in the chat context.")) }, icon("pin"), tr("Als Kontext merken", "Keep as context")),
      h("span", { class: "grow" }), dealMenu(d)),
  ));
}

app = await kit.start({
  title: { de: "Vertriebspipeline", en: "Sales pipeline" },
  render: (data, host) => {
    app = host;
    return data.mode === "deal" ? detail(data) : pipeline(data);
  },
});
