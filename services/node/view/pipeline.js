// Pipeline view: a funnel and the deals per stage, and a deal detail with the
// customer's contact history.
const kit = await import(new URL(`./kit.js${new URL(import.meta.url).search}`, import.meta.url).href);
const { h, icon, stat, props, ring, reveal, fmtDate, fmtMoney, relDays, menu, empty, ics } = kit;

const OPEN = ["qualifizierung", "bedarfsanalyse", "angebot", "verhandlung"];
const LABELS = { qualifizierung: "Qualifizierung", bedarfsanalyse: "Bedarfsanalyse", angebot: "Angebot", verhandlung: "Verhandlung", gewonnen: "Gewonnen" };
const ACTIVITY = { meeting: ["Termin", "users"], call: ["Anruf", "phone"], email: ["E-Mail", "mail"], note: ["Notiz", "note"] };
const money = (value) => fmtMoney(value, "EUR", true);

let board = null;
let owner = null;
let app;

async function openDeal(id) {
  const data = await app.call("get_deal", { id });
  if (data) app.show(data);
}

const prepare = (d) => app.ask(`Bereite mich auf das nächste Gespräch mit ${d.organizationName} zur Chance „${d.title}“ (${d.id}) vor. Nutze CRM, Verträge, Tickets und Postfach, soweit verfügbar.`);

function dealMenu(d) {
  return menu([
    { label: "Details und Verlauf", icon: "list", disabled: !app.can.call, run: () => openDeal(d.id) },
    { label: "Abschlusstermin in den Kalender", icon: "calendar", disabled: !app.can.download, run: () =>
      app.download(`abschluss-${d.id}.ics`, "text/calendar", ics({
        uid: d.id, title: `Abschluss: ${d.title}`, date: d.closeDate,
        description: `${d.organizationName} · ${money(d.value)} · ${d.stageLabel}\nNächster Schritt: ${d.nextStep}`,
      })) },
    "-",
    { label: "Termin vorbereiten", icon: "sparkles", disabled: !app.can.chat, run: () => prepare(d) },
    { label: "Follow-up-Mail entwerfen", icon: "mail", disabled: !app.can.chat, run: () =>
      app.ask(`Entwirf eine kurze Follow-up-Mail an ${d.contact?.name ?? "den Ansprechpartner"} (${d.organizationName}) zur Chance „${d.title}“. Nächster Schritt laut CRM: ${d.nextStep}`) },
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
  if (!d.open) return `${d.stage === "gewonnen" ? "gewonnen" : "verloren"} am ${fmtDate(d.closeDate)}`;
  if (d.overdue) return `überfällig seit ${-d.daysToClose} Tagen`;
  return `Abschluss ${relDays(d.daysToClose)}`;
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
        h("div", { class: "eyebrow" }, "Vertriebspipeline"),
        h("h1", { class: "title" }, `${money(sum(open))} offen in ${open.length} Chancen`),
        h("p", { class: "subtitle" }, `${money(sum(open.filter((d) => d.closeDate <= data.totals.quarterEnd)))} mit Abschluss bis ${fmtDate(data.totals.quarterEnd, { year: undefined })}`)),
      h("div", { class: "hero-figure" },
        h("div", { class: "figure" }, money(sum(open, "weightedValue"))),
        h("div", { class: "figure-label" }, "gewichteter Forecast"))),
    h("div", { class: "stats" },
      stat(open.length, "offene Chancen"),
      stat(money(sum(won)), `gewonnen ${data.today.slice(0, 4)}`),
      stat(attention.length, "brauchen Aufmerksamkeit", attention.length ? "danger" : null),
      stat(`${Math.round((sum(open, "weightedValue") / Math.max(1, sum(open))) * 100)} %`, "Ø Wahrscheinlichkeit")),
    h("div", { class: "row filters" },
      h("span", { class: "eyebrow grow" }, "Verantwortlich"),
      h("div", { class: "segmented", role: "group", "aria-label": "Verantwortlich" },
        [null, ...owners].map((name) => h("button", {
          type: "button", "aria-pressed": String(owner === name),
          onclick: () => { owner = name; app.show(board); },
        }, name ?? "Alle")))),
    funnel(stages, deals),
    h("section", { class: "list", "aria-label": "Chancen nach Phase" },
      stages.map((stage) => {
        const inStage = deals.filter((d) => d.stage === stage.id);
        if (!inStage.length) return null;
        return [h("div", { class: "group-head" }, h("span", { class: "eyebrow" }, stage.label), h("span", { class: "small faint" }, `${inStage.length} · ${money(sum(inStage))}`)),
          inStage.map((d) => row(d))];
      }),
      lost.length ? h("details", { class: "more" }, h("summary", {}, icon("chevronRight", 14), `Verloren (${lost.length}) · ${money(sum(lost))}`),
        lost.map((d) => row(d))) : null),
  ));
}

// Stage bars sized by value, centred like a funnel; closer to the deal, deeper
// the accent. Won is green, the only status colour here.
function funnel(stages, deals) {
  const values = stages.map((s) => deals.filter((d) => d.stage === s.id).reduce((t, d) => t + d.value, 0));
  const max = Math.max(1, ...values);
  return h("section", { class: "panel funnel", "aria-label": "Trichter" },
    h("div", { class: "panel-head" }, h("h2", { class: "h2 grow" }, "Trichter"), h("span", { class: "small faint" }, "Volumen je Phase")),
    h("div", { class: "panel-body fn" }, stages.map((s, i) => {
      const count = deals.filter((d) => d.stage === s.id).length;
      const width = Math.max(6, (values[i] / max) * 100);
      return h("div", { class: "fn-row" },
        h("span", { class: "fn-label" }, s.label),
        h("span", { class: "fn-track" }, h("span", { class: ["fn-bar", `fn-${i}`, s.id === "gewonnen" && "won"], style: { width: `${width}%` } },
          h("span", { class: "fn-value num" }, money(values[i])))),
        h("span", { class: "fn-meta small faint num" }, `${count} · ${OPEN.includes(s.id) ? `${s.probability} %` : "100 %"}`));
    })));
}

function row(d) {
  const t = tone(d);
  return h("article", { class: ["item", "p-item", t && `s-${t}`], tabindex: 0,
    onclick: (e) => { if (!e.target.closest(".menu")) openDeal(d.id); },
    onkeydown: (e) => { if (e.key === "Enter") openDeal(d.id); } },
    h("span", { class: "p-ring", title: `${d.probability} % Wahrscheinlichkeit` },
      ring(d.open ? d.probability / 100 : d.stage === "gewonnen" ? 1 : 0, { size: 34, stroke: 4, tone: d.stage === "gewonnen" ? "success" : null, children: h("span", { class: "p-pct num" }, d.probability) })),
    h("div", { class: "grow" },
      h("div", { class: "item-title ellipsis" }, d.title),
      h("div", { class: "item-sub ellipsis" }, `${d.organizationName} · ${d.source}`)),
    h("div", { class: "p-when" },
      h("div", { class: ["small", t && d.overdue ? "t-danger" : d.open && d.daysToClose <= 14 ? "t-warning" : ""] }, closeText(d)),
      h("div", { class: ["small", d.open && d.daysSinceActivity > 30 ? "t-warning" : "faint"] },
        d.open && d.daysSinceActivity > 30 ? `${d.daysSinceActivity} Tage ohne Kontakt` : d.owner)),
    h("div", { class: "end p-value" }, h("div", { class: "item-title" }, money(d.value)), d.open ? h("div", { class: "small faint" }, `gewichtet ${money(d.weightedValue)}`) : null),
    dealMenu(d));
}

// --- Deal detail -----------------------------------------------------------------
function detail(data) {
  const { deal: d, organization: o, activities } = data;
  const stages = OPEN.concat("gewonnen");
  const current = stages.indexOf(d.stage);
  const t = tone(d);
  return reveal(h("div", { class: "wrap" },
    board && app.can.call ? h("button", { class: "btn ghost sm back", type: "button", onclick: () => app.show(board) }, icon("arrowLeft"), "Zur Pipeline") : null,
    h("header", { class: "hero" },
      h("div", {},
        h("div", { class: "eyebrow" }, `${o.industry} · ${o.city}`),
        h("h1", { class: "title" }, d.title),
        h("p", { class: "subtitle" }, `${d.organizationName} · ${o.employees.toLocaleString("de-DE")} Mitarbeitende`)),
      h("div", { class: "hero-figure" },
        h("div", { class: "figure" }, money(d.value)),
        h("div", { class: "figure-label" }, d.open ? `gewichtet ${money(d.weightedValue)} · ${d.probability} %` : d.stageLabel))),
    h("ol", { class: "stages", "aria-label": "Phase" }, stages.map((id, i) => h("li", {
      class: [i < current && "done", i === current && "current", d.stage === "verloren" && "lost"],
    }, h("span", { class: "stage-bar" }), h("span", { class: "stage-name" }, LABELS[id])))),
    h("div", { class: ["callout", t] }, icon("target", 18),
      h("div", {}, h("div", { class: "eyebrow" }, "Nächster Schritt"), h("div", { class: "lead" }, d.nextStep)),
      h("div", { class: "when" }, closeText(d))),
    h("div", { class: "split" },
      h("section", { class: "panel" },
        h("div", { class: "panel-head" }, h("h2", { class: "h2 grow" }, "Kontaktverlauf"), h("span", { class: "small faint" }, `${activities.length} Einträge`)),
        h("div", { class: "panel-body" },
          activities.length ? h("ol", { class: "feed" }, activities.map((a) => {
            const [label, iconName] = ACTIVITY[a.type] ?? [a.type, "note"];
            return h("li", {},
              h("span", { class: "feed-icon" }, icon(iconName, 14)),
              h("div", { class: "grow" },
                h("div", { class: "row small" }, h("strong", {}, label), h("span", { class: "faint" }, `${a.by} · ${relDays(kit.daysBetween(data.today, a.date))}`), h("span", { class: "grow" }), h("span", { class: "faint num" }, fmtDate(a.date))),
                h("p", {}, a.summary)));
          })) : empty("clock", "Noch kein Kontakt erfasst."))),
      h("aside", { class: "panel" }, h("div", { class: "panel-body" }, props([
        ["Phase", d.stageLabel],
        ["Abschluss", h("span", {}, fmtDate(d.closeDate), h("span", { class: "sub" }, closeText(d)))],
        ["Quelle", d.source],
        ["Verantwortlich", h("span", {}, d.owner, h("span", { class: "sub" }, "Key Account"))],
        d.contact ? ["Kontakt", h("span", {}, d.contact.name, h("span", { class: "sub" }, d.contact.role), h("span", { class: "sub" }, d.contact.email))] : null,
        ["Kunde", h("span", {}, o.status === "customer" ? "Bestandskunde" : o.status === "prospect" ? "Interessent" : o.status === "lead" ? "Lead" : "Verloren",
          o.contractIds.length ? h("span", { class: "sub" }, `${o.contractIds.length} Verträge`) : null)],
      ]), o.notes ? h("p", { class: "side-note small muted" }, o.notes) : null))),
    h("div", { class: "actions" },
      h("button", { class: "btn primary", type: "button", disabled: !app.can.chat, onclick: () => prepare(d) }, icon("sparkles"), "Termin vorbereiten"),
      h("button", { class: "btn", type: "button", disabled: !app.can.context, onclick: () =>
        app.context({ deal: d.id, title: d.title, organization: d.organizationName, stage: d.stageLabel, value: d.value, closeDate: d.closeDate, nextStep: d.nextStep }, "Die Chance ist jetzt im Kontext des Chats.") }, icon("pin"), "Als Kontext merken"),
      h("span", { class: "grow" }), dealMenu(d)),
  ));
}

app = await kit.start({
  render: (data, host) => {
    app = host;
    return data.mode === "deal" ? detail(data) : pipeline(data);
  },
});
