import type { PublishedSkill } from "@weldall/sdk";

const scope = ["contracts:read"];
const native = [{ kind: "resource" as const, resourceKey: "contracts" }];
const owner = { owner: "Recht und Vertragsmanagement" };

export const contractSkills = (origin: string): PublishedSkill[] => [
  {
    id: "start-fristen",
    title: "Welche Verträge laufen bis Jahresende aus?",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: native,
    meta: { tags: ["start", "verträge", "fristen"], ...owner },
    content: `# Welche Verträge laufen bis Jahresende aus?

Rufe \`list_contracts\` mit \`endsBefore\` auf den 31.12. des laufenden Jahres auf. Frag nach Kündigungsfristen, nimm stattdessen \`deadlineWithinDays\` (z. B. 90).

Antworte in drei Gruppen:
1. **Handeln nötig**: Kündigungsfrist oder Option in den nächsten 60 Tagen, oder Vertrag endet ohne Verlängerung (Anschlussvertrag nötig).
2. **Verlängert sich automatisch**: Kündigungsfrist verstrichen, mit neuem Laufzeitende.
3. **Läuft planmäßig aus**: Entwürfe und beendete Verträge nur kurz erwähnen.

Nenne je Vertrag Vertragspartner, Frist mit Datum, Wert und Verantwortliche. Unterscheide Kunden- und Lieferantenverträge (\`direction\`). Zeigt der Client das Fristenradar, wiederhole die Liste nicht, sondern fasse zusammen und empfiehl die nächsten Schritte.

Nur über HTTP: \`weldall request --scope contracts:read '${origin}/api/contracts?endsBefore=<JJJJ>-12-31'\` mit dem laufenden Jahr.`,
  },
  {
    id: "renewals",
    title: "Kündigungsfristen und Verlängerungen",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: native,
    meta: { tags: ["verträge", "fristen", "verlängerung"], ...owner },
    content: `# Kündigungsfristen und Verlängerungen

\`list_contracts\` mit \`status: "active"\` liefert je Vertrag \`noticeDeadline\`, \`renewedUntil\`, \`nextDeadline\` und \`situation\`. Die Felder sind aus Vertragsende, Kündigungsfrist und Verlängerungsregel berechnet; Grundlage ist der Paragraph „Laufzeit und Kündigung“.

- \`urgency\` ist critical (≤ 14 Tage), soon (≤ 60), planned (≤ 120), later, missed (Frist kürzlich verstrichen, automatisch verlängert) oder none.
- Prüfe vor einer Empfehlung den Paragraphen „Vergütung und Preisanpassung“: Angekündigte Erhöhungen ändern die Entscheidung.
- Schreibe Kündigungen nie selbst ab; entwirf sie nur, wenn danach gefragt wird, mit Vertragsnummer, Frist und Zugangsnachweis.

HTTP: \`weldall request --scope contracts:read '${origin}/api/contracts?status=active&deadlineWithinDays=90'\`.`,
  },
  {
    id: "review",
    title: "Vertrag prüfen",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: native,
    meta: { tags: ["verträge", "klauseln", "prüfung"], ...owner },
    content: `# Vertrag prüfen

Lade den Vertrag mit \`get_contract\` (ID aus \`list_contracts\`, Suche mit \`q\`). Fasse Gegenstand, Laufzeit, Fristen, Vergütung, Haftung und Service-Level zusammen.

- Zitiere Klauseln wörtlich mit Paragraphennummer, statt sie umzuformulieren. Klauseln mit \`important: true\` zuerst.
- Tags der Klauseln: frist, preis, haftung, sla, datenschutz, leistung, abnahme.
- Sag deutlich, wenn eine Frage vom Vertrag nicht beantwortet wird. Das Register ersetzt keine Rechtsberatung.

HTTP: \`weldall request --scope contracts:read ${origin}/api/contracts/{id}\` und \`${origin}/api/contracts/{id}/clauses\`.`,
  },
  {
    id: "by-account",
    title: "Verträge eines Kunden",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: native,
    meta: { tags: ["verträge", "kunden"], ...owner },
    content: `# Verträge eines Kunden

\`list_contracts\` mit \`customerId\` (Organisations-ID aus dem CRM, z. B. org-200). Kennst du nur den Namen, suche mit \`q\`.

Fasse laufende Verträge mit Jahreswert, Entwürfe in Verhandlung und beendete Verträge getrennt zusammen. \`related.tickets\` und \`related.deals\` verweisen auf das Ticketsystem und die Vertriebspipeline im CRM; nutze sie für ein vollständiges Bild, wenn du dort lesen darfst.

HTTP: \`weldall request --scope contracts:read '${origin}/api/contracts?customerId=org-200'\`.`,
  },
];
