import type { PublishedSkill } from "@weldall/sdk";

export const wikiSkills = (origin: string): PublishedSkill[] => [
  {
    id: "search",
    title: "Im Wiki nachschlagen",
    requiredScopes: ["wiki:read"],
    visibility: "HIDDEN_IF_UNALLOWED",
    meta: { tags: ["wiki", "prozesse", "richtlinien"], owner: "Wissensmanagement" },
    content: `# Im Wiki nachschlagen

Das Wiki enthält Prozesse und Richtlinien: Eskalation und SLA (Bereich SVC), Preise, Rabatte und Vertragsverlängerungen (VERTRIEB), Freigaben, Haftung und Ausschreibungen (RECHT), Produktsteckbriefe (PRODUKT).

1. Suchen: \`weldall request --scope wiki:read '${origin}/api/pages?q=<begriff>'\`, optional \`&space=RECHT\`. Treffer haben einen Auszug.
2. Lesen: \`weldall request --scope wiki:read ${origin}/api/pages/{id}\`. Der Inhalt ist Markdown.
3. Bereiche: \`${origin}/api/spaces\`.

Nenne Titel und Stand (\`updated\`) der Seite, auf die du dich stützt. Steht etwas als Entwurf da, sag das. Findet die Suche nichts, versuche ein Synonym, statt eine Regel zu erfinden.`,
  },
];
