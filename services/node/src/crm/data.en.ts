// English version of data.ts: CRM of Brakenstedt Antriebstechnik GmbH (invented).
// Organisation IDs are the customerId values in the contract register;
// contractIds point back. Dates are written as of October 2026 and move with the
// calendar.

export const STAGES = [
  { id: "qualifizierung", label: "Qualification", probability: 10 },
  { id: "bedarfsanalyse", label: "Needs analysis", probability: 25 },
  { id: "angebot", label: "Proposal", probability: 50 },
  { id: "verhandlung", label: "Negotiation", probability: 75 },
  { id: "gewonnen", label: "Won", probability: 100 },
  { id: "verloren", label: "Lost", probability: 0 },
] as const;

export type Stage = (typeof STAGES)[number]["id"];

export const TEAM = [
  { name: "Jana Hartwig", role: "Head of Sales", email: "jana.hartwig@brakenstedt.example" },
  { name: "Tobias Lindner", role: "Key Account Manager North", email: "tobias.lindner@brakenstedt.example" },
  { name: "Selin Aydın", role: "Key Account Manager South", email: "selin.aydin@brakenstedt.example" },
  { name: "Markus Feldmann", role: "Head of Service", email: "markus.feldmann@brakenstedt.example" },
];

export const ORGANIZATIONS = [
  {
    id: "org-100", name: "Stadtwerke Lohmbach GmbH", industry: "Energy and water", status: "customer",
    city: "Lohmbach", employees: 420, owner: "Tobias Lindner", customerSince: "2019-04-01",
    website: "https://stadtwerke-lohmbach.example", annualRevenue: 55680,
    contractIds: ["ctr-1001", "ctr-1002"],
    notes: "Two pumping stations, 14 drives. Decisions go through the utility committee, budget planning in September.",
  },
  {
    id: "org-200", name: "Papierfabrik Rehwinkel AG", industry: "Paper and packaging", status: "customer",
    city: "Rehwinkel", employees: 1150, owner: "Selin Aydın", customerSince: "2016-09-01",
    website: "https://papierfabrik-rehwinkel.example", annualRevenue: 142000,
    contractIds: ["ctr-1003", "ctr-1004"],
    notes: "Largest service customer. PM3 runs 24/7; according to the customer, every hour of downtime costs around EUR 18,000.",
  },
  {
    id: "org-300", name: "Kornfeld Mühlenbetriebe KG", industry: "Food", status: "customer",
    city: "Wettenau", employees: 160, owner: "Selin Aydın", customerSince: "2021-12-01",
    website: "https://kornfeld-muehle.example", annualRevenue: 21600,
    contractIds: ["ctr-1005"],
    notes: "Third-generation family business. Observe hygiene requirements (H1 lubricants).",
  },
  {
    id: "org-400", name: "Hafenlogistik Nordmarsch GmbH", industry: "Logistics", status: "customer",
    city: "Nordmarsch", employees: 780, owner: "Tobias Lindner", customerSince: "2020-03-15",
    website: "https://hafen-nordmarsch.example", annualRevenue: 210000,
    contractIds: ["ctr-1006"],
    notes: "Six container cranes, twelve gantry cranes. Framework agreement ends March 2027 with no renewal.",
  },
  {
    id: "org-500", name: "Talsperrenverband Grauenbach", industry: "Public water management", status: "prospect",
    city: "Grauenbach", employees: 95, owner: "Tobias Lindner", customerSince: null,
    website: "https://talsperren-grauenbach.example", annualRevenue: 0,
    contractIds: ["ctr-1007"],
    notes: "Public tender under VOB/A, watch the bid deadline. Award on best value (price 60%, technical 40%).",
  },
  {
    id: "org-600", name: "Sägewerk Fichtelhain GmbH", industry: "Wood processing", status: "prospect",
    city: "Fichtelhain", employees: 210, owner: "Selin Aydın", customerSince: null,
    website: "https://saegewerk-fichtelhain.example", annualRevenue: 0,
    contractIds: ["ctr-1008"],
    notes: "BRK Monitor pilot since June. The first bearing alert in August prevented a breakdown.",
  },
  {
    id: "org-700", name: "Brauhaus Ellerbrook KG", industry: "Beverages", status: "lead",
    city: "Ellerbrook", employees: 85, owner: "Selin Aydın", customerSince: null,
    website: "https://brauhaus-ellerbrook.example", annualRevenue: 0,
    contractIds: [],
    notes: "Contact made at the \"Antrieb und Prozess\" trade fair. New brewhouse planned.",
  },
  {
    id: "org-800", name: "Harzfeld Zement AG", industry: "Building materials", status: "churned",
    city: "Harzfeld", employees: 640, owner: "Tobias Lindner", customerSince: "2017-01-01",
    website: "https://harzfeld-zement.example", annualRevenue: 0,
    contractIds: ["ctr-1009"],
    notes: "Service lost to a competitor at the end of 2025 (price). Stay in touch, win-back possible in 2027.",
  },
  {
    id: "org-900", name: "Zweckverband Klärwerk Mittlere Aue", industry: "Wastewater", status: "customer",
    city: "Auenstedt", employees: 60, owner: "Tobias Lindner", customerSince: "2022-10-01",
    website: "https://klaerwerk-mittlere-aue.example", annualRevenue: 44500,
    contractIds: ["ctr-1010"],
    notes: "Public sector client, financial year = calendar year. Approvals go through the association assembly.",
  },
  {
    id: "org-1000", name: "Feinguss Ostheide GmbH", industry: "Metalworking", status: "prospect",
    city: "Ostheide", employees: 330, owner: "Selin Aydın", customerSince: null,
    website: "https://feinguss-ostheide.example", annualRevenue: 0,
    contractIds: ["ctr-1011"],
    notes: "Has bought spare parts through dealers so far. Wants a consignment stock, negotiates hard on liability.",
  },
  {
    id: "org-1100", name: "Haselgrund Recycling GmbH", industry: "Waste management and recycling", status: "customer",
    city: "Haselgrund", employees: 240, owner: "Tobias Lindner", customerSince: "2024-03-01",
    website: "https://haselgrund-recycling.example", annualRevenue: 238800,
    contractIds: ["ctr-1012", "ctr-1013"],
    notes: "Growing fast. Won the second shredder drive in September; commissioning in February.",
  },
  {
    id: "org-1200", name: "Bergbahnen Kargrat GmbH", industry: "Tourism", status: "prospect",
    city: "Kargrat", employees: 120, owner: "Selin Aydın", customerSince: null,
    website: "https://bergbahnen-kargrat.example", annualRevenue: 0,
    contractIds: [],
    notes: "The chairlift overhaul must be completed before the season starts. The managing director decides alone.",
  },
];

export const CONTACTS = [
  { id: "person-100", organizationId: "org-100", name: "Dirk Ahlers", role: "Head of Network Operations", email: "d.ahlers@stadtwerke-lohmbach.example" },
  { id: "person-101", organizationId: "org-100", name: "Sabine Kröger", role: "Purchasing", email: "s.kroeger@stadtwerke-lohmbach.example" },
  { id: "person-200", organizationId: "org-200", name: "Carsten Meißner", role: "Technical Director", email: "carsten.meissner@papierfabrik-rehwinkel.example" },
  { id: "person-201", organizationId: "org-200", name: "Ute Blum", role: "Head of Maintenance PM3", email: "ute.blum@papierfabrik-rehwinkel.example" },
  { id: "person-202", organizationId: "org-200", name: "Florian Hesse", role: "Strategic Purchasing", email: "florian.hesse@papierfabrik-rehwinkel.example" },
  { id: "person-300", organizationId: "org-300", name: "Anja Wiesner", role: "Managing Director", email: "a.wiesner@kornfeld-muehle.example" },
  { id: "person-301", organizationId: "org-300", name: "Ralf Kornfeld", role: "Operations Manager", email: "r.kornfeld@kornfeld-muehle.example" },
  { id: "person-400", organizationId: "org-400", name: "Henrik Paulsen", role: "Head of Engineering", email: "henrik.paulsen@hafen-nordmarsch.example" },
  { id: "person-401", organizationId: "org-400", name: "Katrin Lüders", role: "Maintenance Purchasing", email: "katrin.lueders@hafen-nordmarsch.example" },
  { id: "person-500", organizationId: "org-500", name: "Ingrid Lamprecht", role: "Head of Plant Department", email: "i.lamprecht@talsperren-grauenbach.example" },
  { id: "person-600", organizationId: "org-600", name: "Bernd Kollmann", role: "Plant Manager", email: "b.kollmann@saegewerk-fichtelhain.example" },
  { id: "person-700", organizationId: "org-700", name: "Thomas Ellerbrook", role: "Master Brewer and Owner", email: "thomas@brauhaus-ellerbrook.example" },
  { id: "person-800", organizationId: "org-800", name: "Gerd Stamm", role: "Plant Manager", email: "g.stamm@harzfeld-zement.example" },
  { id: "person-900", organizationId: "org-900", name: "Martina Oswald", role: "Treatment Plant Manager", email: "m.oswald@klaerwerk-mittlere-aue.example" },
  { id: "person-1000", organizationId: "org-1000", name: "Julia Brenner", role: "Head of Purchasing", email: "j.brenner@feinguss-ostheide.example" },
  { id: "person-1100", organizationId: "org-1100", name: "Michael Kessling", role: "Managing Director", email: "michael.kessling@haselgrund-recycling.example" },
  { id: "person-1101", organizationId: "org-1100", name: "Svenja Rohde", role: "Operations Manager", email: "svenja.rohde@haselgrund-recycling.example" },
  { id: "person-1200", organizationId: "org-1200", name: "Matthias Ortner", role: "Managing Director", email: "m.ortner@bergbahnen-kargrat.example" },
];

export const ACTIVITIES = [
  { id: "act-1", organizationId: "org-200", date: "2026-10-27", type: "call", by: "Selin Aydın", contactId: "person-201", summary: "Ute Blum reports another temperature rise on the PM3 main drive. Ticket SVC-1042 opened, technician scheduled for tomorrow morning." },
  { id: "act-2", organizationId: "org-200", date: "2026-10-14", type: "meeting", by: "Selin Aydın", contactId: "person-200", summary: "Quarterly review: Mr Meißner wants to decide on modernising the roll drive before the March shutdown. Asks for a proposal with a financing option." },
  { id: "act-3", organizationId: "org-200", date: "2026-09-30", type: "email", by: "Selin Aydın", contactId: "person-202", summary: "Sent the PM3 modernisation proposal (EUR 480,000) to Mr Hesse. Query about the delivery time of the planetary gearbox." },
  { id: "act-4", organizationId: "org-200", date: "2026-08-21", type: "note", by: "Markus Feldmann", contactId: null, summary: "SLA only just met twice in August (3:40 h, 3:55 h). Add one technician to the PM3 on-call rota." },
  { id: "act-5", organizationId: "org-100", date: "2026-10-22", type: "meeting", by: "Tobias Lindner", contactId: "person-100", summary: "Autumn maintenance at the North pumping station completed. Mr Ahlers asks about extending BRK Monitor to the waterworks." },
  { id: "act-6", organizationId: "org-100", date: "2026-09-12", type: "email", by: "Tobias Lindner", contactId: "person-101", summary: "Ms Kröger confirms the 2027 maintenance budget is unchanged. No termination planned." },
  { id: "act-7", organizationId: "org-300", date: "2026-10-20", type: "email", by: "Selin Aydın", contactId: "person-300", summary: "Ms Wiesner asks for a quote to renew the maintenance contract and whether the silo discharge can be included." },
  { id: "act-8", organizationId: "org-300", date: "2026-09-02", type: "meeting", by: "Selin Aydın", contactId: "person-301", summary: "Site walk of the silo plant: an additional screw conveyor is planned from spring. Need for two geared motors." },
  { id: "act-9", organizationId: "org-400", date: "2026-10-09", type: "meeting", by: "Tobias Lindner", contactId: "person-400", summary: "Workshop on the container crane 4 retrofit: target is 20% less energy in the hoist. Measurement data to follow by mid-November." },
  { id: "act-10", organizationId: "org-400", date: "2026-08-28", type: "call", by: "Tobias Lindner", contactId: "person-401", summary: "Ms Lüders announces that the framework agreement will be retendered for 2027. We should submit a renewal offer before year end." },
  { id: "act-11", organizationId: "org-500", date: "2026-10-16", type: "note", by: "Tobias Lindner", contactId: null, summary: "Downloaded the tender documents for the gate actuators. Bid deadline [[2026-11-13]], bidder questions by [[2026-11-04]]." },
  { id: "act-12", organizationId: "org-500", date: "2026-09-24", type: "meeting", by: "Tobias Lindner", contactId: "person-500", summary: "Site visit at the pre-dam with Ms Lamprecht. Three actuators corroded, emergency operation by handwheel." },
  { id: "act-13", organizationId: "org-600", date: "2026-10-23", type: "call", by: "Selin Aydın", contactId: "person-600", summary: "Mid-term review of the pilot: Mr Kollmann is convinced but wants to see a price for 20 measuring points and a quote for a chipper unit." },
  { id: "act-14", organizationId: "org-600", date: "2026-08-12", type: "note", by: "Markus Feldmann", contactId: null, summary: "BRK Monitor reports bearing damage on chipper 2, replacement during the planned shutdown. Breakdown avoided." },
  { id: "act-15", organizationId: "org-700", date: "2026-10-05", type: "meeting", by: "Selin Aydın", contactId: "person-700", summary: "First meeting at the trade fair. New brewhouse with six agitators from summer 2027. Would like a reference visit." },
  { id: "act-16", organizationId: "org-800", date: "2026-06-18", type: "call", by: "Tobias Lindner", contactId: "person-800", summary: "Mr Stamm: unhappy with the new provider's response times, their contract runs until the end of 2027. Follow up in spring 2027." },
  { id: "act-17", organizationId: "org-800", date: "2025-09-15", type: "email", by: "Tobias Lindner", contactId: "person-800", summary: "Notice of termination of the service contract received, effective 31 Dec 2025. Reason given by the customer: price 18% above the competition." },
  { id: "act-18", organizationId: "org-900", date: "2026-10-26", type: "call", by: "Markus Feldmann", contactId: "person-900", summary: "Ms Oswald reports noise from agitator 3, tank 2. Visit promised for Thursday (SVC-1045)." },
  { id: "act-19", organizationId: "org-1000", date: "2026-10-19", type: "meeting", by: "Selin Aydın", contactId: "person-1000", summary: "Second round of negotiations: agreement on a consignment stock. Open: liability cap (customer wants EUR 500,000) and price escalation of max. 3%." },
  { id: "act-20", organizationId: "org-1000", date: "2026-09-08", type: "email", by: "Selin Aydın", contactId: "person-1000", summary: "Sent draft contract V-2026-011 to Ms Brenner." },
  { id: "act-21", organizationId: "org-1100", date: "2026-10-21", type: "meeting", by: "Tobias Lindner", contactId: "person-1100", summary: "Kick-off for the second shredder: design approved, delivery date [[2027-02-15]] confirmed. Mr Kessling asks about a service contract for V3." },
  { id: "act-22", organizationId: "org-1100", date: "2026-09-24", type: "email", by: "Tobias Lindner", contactId: "person-1100", summary: "Order for the second shredder drive (EUR 186,000) returned signed." },
  { id: "act-23", organizationId: "org-1200", date: "2026-10-12", type: "call", by: "Selin Aydın", contactId: "person-1200", summary: "Mr Ortner needs the chairlift overhaul done by [[2026-12-01]]. Wants a quote with a fixed date." },
];

export const DEALS = [
  { id: "deal-201", organizationId: "org-200", title: "Modernisation of PM3 roll drive", stage: "verhandlung", value: 480000, closeDate: "2026-12-15", owner: "Selin Aydın", contactId: "person-200", nextStep: "Financing offer with leasing partner by [[2026-11-06]]", lastActivity: "2026-10-14", source: "Existing customer" },
  { id: "deal-301", organizationId: "org-300", title: "Silo discharge extension and contract renewal", stage: "angebot", value: 38500, closeDate: "2026-11-27", owner: "Selin Aydın", contactId: "person-300", nextStep: "Send renewal offer incl. silo discharge before the notice deadline", lastActivity: "2026-10-20", source: "Existing customer" },
  { id: "deal-401", organizationId: "org-400", title: "Hoist retrofit, container crane 4", stage: "bedarfsanalyse", value: 265000, closeDate: "2027-02-26", owner: "Tobias Lindner", contactId: "person-400", nextStep: "Evaluate measurement data, present energy balance", lastActivity: "2026-10-09", source: "Existing customer" },
  { id: "deal-402", organizationId: "org-400", title: "Renewal of crane drive framework agreement 2027-2029", stage: "qualifizierung", value: 630000, closeDate: "2027-01-29", owner: "Tobias Lindner", contactId: "person-401", nextStep: "Place renewal offer before the retender", lastActivity: "2026-08-28", source: "Existing customer" },
  { id: "deal-501", organizationId: "org-500", title: "Tender for dam gate actuators", stage: "angebot", value: 340000, closeDate: "2026-12-18", owner: "Tobias Lindner", contactId: "person-500", nextStep: "Bidder questions by [[2026-11-04]], bid by [[2026-11-13]]", lastActivity: "2026-10-16", source: "Tender" },
  { id: "deal-601", organizationId: "org-600", title: "BRK Monitor rollout, 20 measuring points", stage: "verhandlung", value: 13200, closeDate: "2026-11-30", owner: "Selin Aydın", contactId: "person-600", nextStep: "Quote before the purchase option expires on [[2026-11-30]]", lastActivity: "2026-10-23", source: "Pilot" },
  { id: "deal-602", organizationId: "org-600", title: "New chipper unit, line 2", stage: "qualifizierung", value: 95000, closeDate: "2027-04-30", owner: "Selin Aydın", contactId: "person-600", nextStep: "Request technical data for line 2", lastActivity: "2026-10-23", source: "Pilot" },
  { id: "deal-701", organizationId: "org-700", title: "Agitator drives for brewhouse", stage: "qualifizierung", value: 72000, closeDate: "2027-05-28", owner: "Selin Aydın", contactId: "person-700", nextStep: "Arrange reference visit at Kornfeld Mühlenbetriebe", lastActivity: "2026-10-05", source: "Trade fair" },
  { id: "deal-801", organizationId: "org-800", title: "Win back service for cement line 2", stage: "verloren", value: 58000, closeDate: "2025-11-28", owner: "Tobias Lindner", contactId: "person-800", nextStep: "Follow up in spring 2027", lastActivity: "2026-06-18", source: "Existing customer", lostReason: "Price" },
  { id: "deal-1001", organizationId: "org-1000", title: "Spare parts framework agreement with consignment stock", stage: "verhandlung", value: 120000, closeDate: "2026-12-11", owner: "Selin Aydın", contactId: "person-1000", nextStep: "Agree liability cap with Legal (counter-proposal EUR 250,000)", lastActivity: "2026-10-19", source: "Referral" },
  { id: "deal-1101", organizationId: "org-1100", title: "Drive for second shredder V3", stage: "gewonnen", value: 186000, closeDate: "2026-09-24", owner: "Tobias Lindner", contactId: "person-1100", nextStep: "Offer service contract for V3", lastActivity: "2026-10-21", source: "Existing customer" },
  { id: "deal-1102", organizationId: "org-1100", title: "Service contract for pre-shredder V3", stage: "bedarfsanalyse", value: 24000, closeDate: "2027-01-29", owner: "Tobias Lindner", contactId: "person-1100", nextStep: "Propose scope of services in line with V1/V2", lastActivity: "2026-10-21", source: "Existing customer" },
  { id: "deal-1201", organizationId: "org-1200", title: "Overhaul of Gipfelexpress chairlift drive", stage: "angebot", value: 64000, closeDate: "2026-11-06", owner: "Selin Aydın", contactId: "person-1200", nextStep: "Follow up on fixed-date quote by Friday", lastActivity: "2026-10-12", source: "Cold outreach" },
  { id: "deal-102", organizationId: "org-100", title: "BRK Monitor for Lohmbach waterworks", stage: "bedarfsanalyse", value: 21600, closeDate: "2027-01-15", owner: "Tobias Lindner", contactId: "person-100", nextStep: "Survey measuring points in the waterworks", lastActivity: "2026-10-22", source: "Existing customer" },
];
