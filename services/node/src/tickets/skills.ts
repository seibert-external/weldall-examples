import type { PublishedSkill } from "@weldall/sdk";

const scope = ["tickets:read"];
const native = [{ kind: "resource" as const, resourceKey: "tickets" }];
const owner = { owner: "Kundenservice" };

export const ticketSkills = (origin: string): PublishedSkill[] => [
  {
    id: "start-stoerungen",
    title: "Welche Störungen sind gerade kritisch?",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: native,
    meta: { tags: ["start", "service", "störungen"], ...owner },
    content: `# Welche Störungen sind gerade kritisch?

Rufe \`list_tickets\` mit \`open: true\` auf. Kritisch ist, was mindestens eines erfüllt:
- Priorität „Kritisch“ oder „Hoch“ mit laufender SLA-Uhr,
- \`slaState.state\` ist \`breached\` (überschritten) oder \`due-soon\` (≤ 4 Stunden),
- noch niemand zugewiesen.

Nenne je Ticket Schlüssel, Kunde, Anlage, wer dran ist, SLA-Restzeit und den letzten Stand aus dem Verlauf (\`get_ticket\`). Restzeiten gelten zum Stand, den das Ergebnis in der ersten Zeile nennt; rechne sie nicht mit der eigenen Uhrzeit nach. Hängt ein Ticket an einem Vertrag (\`contractId\`) mit Gutschrift- oder Vertragsstrafenregel, erwähne das. Zeigt der Client Ticketkarten, fasse zusammen statt alles zu wiederholen.

HTTP: \`weldall request --scope tickets:read '${origin}/api/tickets?open=true'\`.`,
  },
  {
    id: "ticket-status",
    title: "Stand eines Tickets",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: native,
    meta: { tags: ["service", "tickets"], ...owner },
    content: `# Stand eines Tickets

\`get_ticket\` mit dem Schlüssel (z. B. SVC-1042) liefert Beschreibung, Anlage, SLA und Verlauf. Fasse den Stand in drei Sätzen zusammen: was ist passiert, was ist der letzte Schritt, was ist als Nächstes zu tun und bis wann.

Interne Notizen (\`internal: true\`) nie in Texte an Kunden übernehmen. Entwürfe an Kunden in der Sie-Form, sachlich, mit Ticketschlüssel.

HTTP: \`weldall request --scope tickets:read ${origin}/api/tickets/SVC-1042\`.`,
  },
  {
    id: "customer-tickets",
    title: "Tickets eines Kunden",
    requiredScopes: scope,
    visibility: "HIDDEN_IF_UNALLOWED",
    mcpDependencies: native,
    meta: { tags: ["service", "kunden"], ...owner },
    content: `# Tickets eines Kunden

\`list_tickets\` mit \`customerId\` (Organisations-ID aus dem CRM). Trenne offene und erledigte Tickets, zähle Reklamationen und SLA-Verletzungen der letzten Monate und nenne Muster (gleiche Anlage, gleiche Ursache).

HTTP: \`weldall request --scope tickets:read '${origin}/api/tickets?customerId=org-200'\`.`,
  },
];
