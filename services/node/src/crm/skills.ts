import type { PublishedSkill } from "@weldall/sdk";

const scope = ["crm:read"];
const owner = { owner: "Vertrieb" };

export const crmSkills = (origin: string): PublishedSkill[] => [
  {
    id: "start-pipeline",
    title: "Wie steht unsere Vertriebspipeline?",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: [{ kind: "resource", resourceKey: "crm" }],
    meta: { tags: ["start", "vertrieb", "pipeline"], ...owner },
    content: `# Wie steht unsere Vertriebspipeline?

Rufe \`show_pipeline\` auf (optional \`owner\` für eine Person). Ordne die Lage in wenigen Sätzen ein:

- offene Pipeline und gewichteter Wert, Abschlüsse bis Quartalsende (\`totals\`),
- die drei Chancen mit dem größten Handlungsbedarf: überfällig (\`overdue\`), Abschluss in ≤ 14 Tagen oder seit über 30 Tagen ohne Kontakt (\`daysSinceActivity\`),
- je Chance den nächsten Schritt aus \`nextStep\` und wer ihn verantwortet.

Zeigt der Client das Pipeline-Board, zähle nicht alle Chancen auf. Verlorene Chancen sind kein Pipeline-Wert.

HTTP: \`weldall request --scope crm:read ${origin}/api/pipeline\`.`,
  },
  {
    id: "start-kundenbriefing",
    title: "Bereite mich auf den Termin mit der Papierfabrik Rehwinkel vor",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: [
      { kind: "resource", resourceKey: "crm" },
      { kind: "resource", resourceKey: "contracts" },
      { kind: "resource", resourceKey: "tickets" },
    ],
    meta: { tags: ["start", "vertrieb", "briefing"], ...owner },
    content: `# Kundenbriefing vor einem Termin

Für einen Kunden, im Beispiel die Papierfabrik Rehwinkel (org-200):

1. \`search_accounts\` mit dem Namen, dann \`get_account\`: Stammdaten, Ansprechpartner, letzte Kontakte, offene Chancen.
2. Mit Zugriff auf das Vertragsregister: \`list_contracts\` mit \`customerId\` für Laufzeiten und nahe Fristen.
3. Mit Zugriff auf das Ticketsystem: \`list_tickets\` mit \`customerId\` für offene Störungen und SLA-Lage.
4. Mit Zugriff auf das Postfach: die letzten Nachrichten des Kunden (siehe Skill des Postfachs).

Gliedere das Briefing in: Wer sitzt am Tisch, was läuft gut, was brennt, worüber wir sprechen sollten (Chancen, Fristen), offene Fragen. Fehlt ein System, sag welches, statt zu raten.

HTTP: \`weldall request --scope crm:read ${origin}/api/organizations/org-200/briefing\`.`,
  },
  {
    id: "briefing",
    title: "Kundenbriefing",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: [{ kind: "resource", resourceKey: "crm" }],
    meta: { tags: ["crm", "kunden", "briefing"], ...owner },
    content: `# Kundenbriefing

\`get_account\` liefert Kunde, Ansprechpartner, Kontaktverlauf (neueste zuerst), Chancen und \`contractIds\` für das Vertragsregister. Nenne Rolle und Ansprechpartner beim Namen, fasse die letzten drei Kontakte zusammen und markiere offene Fragen aus dem Verlauf.

Status: customer (Kunde), prospect (Interessent), lead (Erstkontakt), churned (verloren).

HTTP: \`weldall request --scope crm:read ${origin}/api/organizations/{id}/briefing\`, Suche über \`${origin}/api/organizations?q=<name>\` und \`${origin}/api/contacts?q=<name>\`.`,
  },
  {
    id: "pipeline",
    title: "Verkaufschancen auswerten",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: [{ kind: "resource", resourceKey: "crm" }],
    meta: { tags: ["crm", "pipeline", "vertrieb"], ...owner },
    content: `# Verkaufschancen auswerten

\`show_pipeline\` liefert alle Chancen mit Phase, Wahrscheinlichkeit, gewichtetem Wert und Abschlussdatum, \`get_deal\` eine Chance mit dem Kontaktverlauf des Kunden.

Phasen und Wahrscheinlichkeiten: Qualifizierung 10 %, Bedarfsanalyse 25 %, Angebot 50 %, Verhandlung 75 %, Gewonnen 100 %, Verloren 0 %. Summen nur über offene Chancen bilden. Ein Abschlussdatum in der Vergangenheit bei offener Chance ist überfällig und gehört angesprochen.

HTTP: \`weldall request --scope crm:read '${origin}/api/deals?stage=verhandlung'\`.`,
  },
];
