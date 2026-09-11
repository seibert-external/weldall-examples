// Entirely fictional records; customer IDs match the CRM fixtures.
export const contracts = [
  {
    id: "ctr-1001",
    customerId: "org-100",
    title: "Northstar support agreement",
    status: "active",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
    value: 24000,
    currency: "EUR",
    summary: "Business-hours support for a fictional observatory.",
    clauses: [
      {
        id: "cl-1",
        heading: "Support",
        text: "Support is available Monday to Friday, 09:00–17:00 UTC.",
      },
      {
        id: "cl-2",
        heading: "Renewal",
        text: "Renews only with written agreement from both parties.",
      },
    ],
  },
  {
    id: "ctr-1002",
    customerId: "org-200",
    title: "Juniper implementation project",
    status: "draft",
    startsOn: "2026-10-01",
    endsOn: "2027-03-31",
    value: 48000,
    currency: "EUR",
    summary: "A mock six-month software implementation.",
    clauses: [
      {
        id: "cl-1",
        heading: "Milestones",
        text: "Discovery, prototype, and handover are separate milestones.",
      },
    ],
  },
  {
    id: "ctr-1003",
    customerId: "org-100",
    title: "Northstar evaluation license",
    status: "expired",
    startsOn: "2025-10-01",
    endsOn: "2025-12-31",
    value: 0,
    currency: "EUR",
    summary: "A completed, no-cost evaluation using synthetic data.",
    clauses: [
      {
        id: "cl-1",
        heading: "Evaluation",
        text: "Evaluation use only; no production data permitted.",
      },
    ],
  },
];
