// English version of data.ts: company wiki of Brakenstedt Antriebstechnik GmbH
// (invented). Page bodies are Markdown. Dates are written as of October 2026 and
// move with the calendar.

export const SPACES = [
  { key: "SVC", name: "Customer Service", description: "Service processes, SLAs and on-call duty." },
  { key: "VERTRIEB", name: "Sales", description: "Prices, discounts and contract renewals." },
  { key: "RECHT", name: "Legal and Contracts", description: "Approvals, signatures, public tenders." },
  { key: "PRODUKT", name: "Products", description: "Product sheets and technical data." },
];

export const PAGES = [
  {
    id: "page-101", space: "SVC", title: "Escalation process for breakdowns", author: "Markus Feldmann", updated: "2026-09-18",
    labels: ["process", "sla", "escalation"],
    body: `## When to escalate

| Priority | Example | Escalate to | At the latest |
|---|---|---|---|
| Critical | Plant down or running in emergency mode | Head of Service (Markus Feldmann) and Key Account | immediately |
| High | Plant restricted, outage imminent | Dispatch (Lea Brandt) | 1 hour before the SLA expires |
| Medium | Fault without impact on production | Dispatch | after the SLA expires |

## Procedure
1. Create or take over the ticket in the system and agree the priority with the customer.
2. Call the customer back within the response time and record the call in the ticket (counts as the response).
3. If the restoration time is at risk: inform the customer **in writing** and have them confirm the downtime window. A release postponed by the customer only pauses the SLA clock if confirmed in writing.
4. After completion: document the cause, actions taken and spare parts in the ticket.

## Service credits
Service credits under the contract (e.g. 5% of the monthly fee for Rehwinkel) are booked by the Head of Service, not by field service.`,
  },
  {
    id: "page-102", space: "SVC", title: "SLA definitions and measurement", author: "Markus Feldmann", updated: "2026-06-03",
    labels: ["sla", "definition"],
    body: `- **Response time**: from the report (hotline or ticket) until a qualified callback by a technician. An automatic acknowledgement of receipt does not count.
- **Restoration time**: until the plant is back in agreed operation, even provisionally (e.g. swap from the pool).
- The clocks run around the clock if the contract says "24/7", otherwise only on working days from 7 am to 5 pm.

| Customer | Response | Restoration | Consequence of a breach |
|---|---|---|---|
| Papierfabrik Rehwinkel (PM3) | 4 h, 24/7 | 24 h | 5% of the monthly fee per breach, max. 25% |
| Hafenlogistik Nordmarsch | 8 h, 7 days | 36 h (pool swap) | EUR 1,500 per day, max. EUR 15,000 per year |
| Haselgrund Recycling | 8 h, working days | 48 h | EUR 250 per breach |
| Klärwerk Mittlere Aue | 12 h, working days | 72 h | no penalty, right of termination if repeated |`,
  },
  {
    id: "page-103", space: "SVC", title: "On-call duty: rules and pay", author: "Lea Brandt", updated: "2026-10-01",
    labels: ["on-call", "staff"],
    body: `On-call duty rotates weekly on Mondays at 7 am. The current rota is posted in Dispatch and in the "Service on-call" calendar.

- Reachable within 15 minutes, ready to drive within 30 minutes.
- Since September, a second technician has also been scheduled for Rehwinkel PM3 (decided after two close SLA cases in August).
- Pay: weekly flat rate plus call-out time with a supplement as per the works agreement.`,
  },
  {
    id: "page-201", space: "VERTRIEB", title: "Service price list 2027 (draft)", author: "Jana Hartwig", updated: "2026-10-15",
    labels: ["prices", "2027", "draft"],
    body: `**Draft, to be approved by management in mid-November.**

| Service | 2026 | 2027 (draft) |
|---|---|---|
| Service technician, working day | EUR 98/h | EUR 102/h |
| Night and weekend supplement | 50% | 50% |
| 24/7 on-call cover per month | EUR 1,900 | EUR 2,000 |
| BRK Monitor per measuring point and month | EUR 60 | EUR 62 |
| Flat-rate travel up to 100 km | EUR 120 | EUR 125 |

Existing contracts with a price adjustment clause are adjusted at the start of the contract year; contracts without a clause only on renewal. Approach customers whose notice period falls in winter (Kornfeld, Rehwinkel) with a new offer **before** the notice period expires.`,
  },
  {
    id: "page-202", space: "VERTRIEB", title: "Discounts and approval limits", author: "Jana Hartwig", updated: "2026-03-10",
    labels: ["discount", "approval"],
    body: `| Discount on list price | Approved by |
|---|---|
| up to 5% | Key Account Manager |
| up to 10% | Head of Sales (Jana Hartwig) |
| over 10% or fixed price for more than 24 months | Management |

Multi-year contracts (3 years or more) may receive an additional 3%. Always tie discounts to something in return (term, volume, reference).`,
  },
  {
    id: "page-203", space: "VERTRIEB", title: "Handling contract renewals", author: "Jana Hartwig", updated: "2026-05-22",
    labels: ["renewal", "process", "deadlines"],
    body: `1. **120 days before the notice deadline**: the key account manager reviews revenue, tickets and complaints from the past year.
2. **90 days before**: meeting with the customer about needs and satisfaction; offer for renewal or extension.
3. **30 days before**: the offer is with the customer. For supplier contracts, Purchasing decides on termination or renewal.
4. If a deadline passes without a decision, do **not** "pin" the customer to the automatic renewal; talk to them instead.

Deadlines are recorded in the contract register; the agent query "Which contracts expire by the end of the year?" shows them on a timeline.`,
  },
  {
    id: "page-301", space: "RECHT", title: "Contract approval and signatures", author: "Dr. Henrike Sommer", updated: "2026-02-14",
    labels: ["legal", "approval", "liability"],
    body: `- Every customer and supplier contract over EUR 25,000 per year goes to Legal and Contract Management (Dr. Henrike Sommer) before signature.
- **Liability**: the standard cap is the annual fee, at most EUR 250,000 per claim. Higher caps only with management approval and a check of insurance cover (public liability insurance EUR 5 million).
- **Contractual penalties** only with a cap; always exclude loss of production.
- Signature: up to EUR 100,000 total value two authorised signatories (Prokuristen), above that management.`,
  },
  {
    id: "page-302", space: "RECHT", title: "Public tenders", author: "Dr. Henrike Sommer", updated: "2026-07-07",
    labels: ["procurement", "tender", "vob"],
    body: `While a procurement procedure is running, the following applies to all contact with the contracting authority:

- Questions only via the procurement platform as a **bidder question**, not by phone or email to specialist departments.
- Service calls at the contracting authority only after consulting Legal, so that there is no appearance of granting an advantage. Time-and-materials work at list prices is generally permitted.
- Bid deadlines are strict cut-off dates: submit at least one working day in advance.`,
  },
  {
    id: "page-401", space: "PRODUKT", title: "BRK Monitor: product sheet", author: "Markus Feldmann", updated: "2026-08-30",
    labels: ["product", "brk-monitor", "iot"],
    body: `Condition monitoring for gearboxes and motors with wireless sensors (vibration, temperature), gateway and web portal.

- Typically detects bearing and gear tooth damage 2 to 6 weeks before failure.
- Data stored in a data centre in Frankfurt am Main, data processing under Art. 28 GDPR.
- Price 2026: EUR 60 per measuring point and month; pilot with up to 8 measuring points free of charge for 6 months.
- References: Stadtwerke Lohmbach (24 measuring points), pilot at Sägewerk Fichtelhain (bearing damage on chipper 2 detected in time in August).`,
  },
  {
    id: "page-402", space: "PRODUKT", title: "BP series planetary gearboxes", author: "Konstantin Weber", updated: "2026-04-11",
    labels: ["product", "gearbox", "engineering"],
    body: `| Type | Rated torque | Ratio | Typical application |
|---|---|---|---|
| BP-420 | 42 kNm | 20-160 | Travel drives, conveyors |
| BP-640 | 64 kNm | 25-200 | Pre-shredders, agitators |
| BP-900 | 90 kNm | 30-250 | Shredders, mills |

Change the oil every 10,000 operating hours or based on oil analysis. No warranty for damage caused by foreign objects; document findings with photos.`,
  },
];
