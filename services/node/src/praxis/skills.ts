import type { PublishedSkill } from "@weldall/sdk";

const scope = ["praxis:read"];
const native = [{ kind: "resource" as const, resourceKey: "praxis" }];
const owner = { owner: "Praxismanagement" };

export const praxisSkills = (origin: string): PublishedSkill[] => [
  {
    id: "start-recall",
    title: "Wen laden wir diese Woche zur Prophylaxe ein?",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: native,
    meta: { tags: ["start", "praxis", "recall", "prophylaxe"], ...owner },
    content: `# Wen laden wir diese Woche zur Prophylaxe ein?

Rufe \`list_recall\` auf. Das Ergebnis enthält die überfälligen Patienten und die freien Prophylaxe-Slots nächste Woche.

Antworte so:
1. **Zuerst anrufen**: die am längsten Überfälligen und Parodontitis-Patienten (Recall 3 Monate), höchstens zehn, mit Kontaktweg.
2. **Vorschlag**: ordne ihnen freie PZR-Slots bei ZMP Herbst zu. Beachte die Hinweise (z. B. „nur ab 14 Uhr“, „lieber vormittags“).
3. **Nachricht**: biete an, Einladungen im jeweiligen Kontaktweg zu entwerfen (SMS kurz, Brief förmlich, Sie-Form).

Zeigt der Client das Recall-Cockpit, wiederhole die Liste nicht, sondern nenne Reihenfolge und Begründung. Termine werden hier nicht gebucht; das Praxisteam trägt sie im Terminbuch ein.

Nur über HTTP: \`weldall request --scope praxis:read ${origin}/api/recall\` und \`${origin}/api/slots\`. Schreibt der Nutzer Englisch, hänge \`lang=en\` an die Abfrage an.`,
  },
  {
    id: "start-luecken",
    title: "Wo sind nächste Woche noch Lücken im Kalender?",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: native,
    meta: { tags: ["start", "praxis", "termine", "auslastung"], ...owner },
    content: `# Wo sind nächste Woche noch Lücken im Kalender?

Rufe \`free_slots\` ohne Filter auf (nächste Woche, alle Behandler). Fasse je Behandler zusammen, an welchen Tagen besonders viel frei ist.

Empfiehl, wie die Lücken gefüllt werden: Prophylaxe-Lücken mit überfälligen Recall-Patienten (\`list_recall\`), Behandler-Lücken mit Kontrollen. Nenne konkrete Slots mit Wochentag und Uhrzeit.

HTTP: \`weldall request --scope praxis:read '${origin}/api/slots?week=next'\`. Schreibt der Nutzer Englisch, hänge \`lang=en\` an die Abfrage an.`,
  },
  {
    id: "start-ausfaelle",
    title: "An welchen Tagen fallen die meisten Termine aus?",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: native,
    meta: { tags: ["start", "praxis", "ausfälle"], ...owner },
    content: `# An welchen Tagen fallen die meisten Termine aus?

Rufe \`no_show_rates\` auf. Nenne die Wochentage mit der höchsten Ausfallquote und die Zahl der betroffenen Termine.

Schlage zwei bis drei Maßnahmen vor, etwa eine Erinnerung per SMS am Vortag für Montags- und Freitagstermine oder eine Warteliste für kurzfristige Lücken. Rechne nichts hoch, was die Daten nicht hergeben.

HTTP: \`weldall request --scope praxis:read ${origin}/api/no-shows\`. Schreibt der Nutzer Englisch, hänge \`lang=en\` an die Abfrage an.`,
  },
  {
    id: "patient",
    title: "Patient nachschlagen",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: native,
    meta: { tags: ["praxis", "patient"], ...owner },
    content: `# Patient nachschlagen

Finde den Patienten mit \`list_recall\` (Suche mit \`q\`, \`dueWithinDays: 90\` für alle mit Recall in Sicht) und lade ihn mit \`get_patient\`. Fasse Recall-Stand, letzte und nächste Termine und Hinweise zusammen.

Die Praxisverwaltung enthält nur Verwaltungsdaten, keine Befunde. Alle Patienten sind erfunden.

HTTP: \`weldall request --scope praxis:read ${origin}/api/patients/{id}\`. Schreibt der Nutzer Englisch, hänge \`lang=en\` an die Abfrage an.`,
  },
];
