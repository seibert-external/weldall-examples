// English version of data.ts: contract register of Brakenstedt Antriebstechnik GmbH (invented company).
// Dates are written as of October 2026 and move with the calendar (shared/dates.ts);
// [[YYYY-MM-DD]] in clause text becomes a localized date. customerId values are
// organisation IDs in the CRM; supplier contracts have none.

import type { Clause, Contract as GermanContract } from "./data.js";

export type { Clause };

export type Contract = Omit<GermanContract, "valueBasis"> & {
  valueBasis: "annual" | "one-off" | "call-off volume";
};

type Draft = Omit<Contract, "clauses" | "currency" | "milestones"> & {
  milestones?: Contract["milestones"];
  scope: string;
  services: string;
  sla?: { reaction: string; restore: string; credit: string };
  price: string;
  liability: string;
  processing?: boolean;
  extra?: Omit<Clause, "id" | "number">[];
};

const period = (notice: Draft["notice"]) =>
  notice?.weeks ? `${notice.weeks} weeks'` : notice?.months === 1 ? "one month's" : `${notice?.months} months'`;

function term(c: Draft): string {
  const start = `The contract commences on [[${c.startsOn}]] and runs until [[${c.endsOn}]].`;
  if (!c.notice && !c.renewal.automatic)
    return `${start} It ends at the close of that day without the need for notice of termination. Any continuation requires a new written agreement.`;
  const notice = `Either party may terminate the contract in writing with ${period(c.notice)} notice to the end of the term; the date of receipt of the notice is decisive.`;
  const renewal = c.renewal.automatic
    ? `If notice is not given in time, the contract is renewed for a further ${c.renewal.months} months each time on the terms then applicable.`
    : "Tacit renewal is excluded; any continuation requires a written agreement.";
  return `${start} ${notice} ${renewal} The right to terminate for good cause remains unaffected.`;
}

function build(c: Draft): Contract {
  const { scope, services, sla, price, liability, processing, extra = [], ...contract } = c;
  const clauses: Omit<Clause, "id" | "number">[] = [
    { heading: "Subject matter", text: scope, tags: ["leistung"] },
    { heading: "Scope of services", text: services, tags: ["leistung"] },
    ...(sla
      ? [{
          heading: "Response and restoration times",
          text: `The Client reports faults via the service hotline or the ticket system. The response time is ${sla.reaction}, and the restoration time for "critical" priority faults is ${sla.restore}. ${sla.credit}`,
          tags: ["sla", "haftung"],
          important: true,
        }]
      : []),
    ...extra,
    { heading: "Remuneration and price adjustment", text: price, tags: ["preis"], important: /adjust|increase|index/i.test(price) },
    { heading: "Term and termination", text: term(c), tags: ["frist"], important: true },
    { heading: "Liability", text: liability, tags: ["haftung"] },
    ...(processing
      ? [{
          heading: "Data protection",
          text: "Where the Contractor processes personal data in the course of remote maintenance or condition monitoring, it does so solely on the basis of the data processing agreement under Art. 28 GDPR attached as Annex 3. Processing takes place in data centres within the European Union.",
          tags: ["datenschutz"],
        }]
      : []),
    {
      heading: "Final provisions",
      text: "Amendments and additions must be made in text form. German law applies. The place of jurisdiction is Kassel, provided the Client is a merchant. Should any provision be invalid, the validity of the remaining provisions remains unaffected.",
      tags: [],
    },
  ];
  return {
    ...contract,
    milestones: c.milestones ?? [],
    currency: "EUR",
    clauses: clauses.map((clause, index) => ({ id: `cl-${index + 1}`, number: `§ ${index + 1}`, ...clause })),
  };
}

const LIABILITY_STANDARD =
  "The Contractor is liable without limitation for intent and gross negligence and for injury to life, body or health. In the event of a slightly negligent breach of material contractual obligations, liability is limited to the damage typically foreseeable under the contract, and at most to the annual remuneration. Liability for loss of profit and loss of production is excluded to the extent permitted by law.";

export const contracts: Contract[] = [
  build({
    id: "ctr-1001", number: "V-2023-014", title: "Maintenance contract for pumping stations North and South", kind: "Maintenance contract",
    direction: "customer", customerId: "org-100", counterparty: "Stadtwerke Lohmbach GmbH", counterpartyContact: "Dirk Ahlers",
    owner: "Tobias Lindner", status: "active", signedOn: "2023-11-20", startsOn: "2024-01-01", endsOn: "2026-12-31",
    notice: { months: 3 }, renewal: { automatic: true, months: 12 }, value: 38400, valueBasis: "annual",
    summary: "Scheduled maintenance of 14 pump drives in two pumping stations, including vibration analysis and oil service.",
    related: { tickets: ["SVC-1038"], deals: [] },
    scope: "The subject matter is the preventive maintenance and upkeep of the pump drives in the Client's pumping stations North (8 drives) and South (6 drives) as listed in the equipment list in Annex 1.",
    services: "The Contractor carries out two maintenance visits per year, each with visual inspection, vibration measurement, oil analysis and oil change as specified by the manufacturer. Wear parts up to EUR 150 per visit are included in the flat fee. Call-outs for faults outside the maintenance dates are invoiced according to the price list in force at the time.",
    price: "The maintenance fee is EUR 38,400 net per year, payable quarterly in advance. With effect from 1 January of each year, the Contractor may adjust the fee in line with collectively agreed wages in the Hesse metal and electrical industry, by no more than 5% per year.",
    liability: LIABILITY_STANDARD,
  }),
  build({
    id: "ctr-1002", number: "V-2025-003", title: "BRK Monitor subscription: 24 measuring points", kind: "Subscription",
    direction: "customer", customerId: "org-100", counterparty: "Stadtwerke Lohmbach GmbH", counterpartyContact: "Dirk Ahlers",
    owner: "Tobias Lindner", status: "active", signedOn: "2025-02-11", startsOn: "2025-03-01", endsOn: "2027-02-28",
    notice: { months: 2 }, renewal: { automatic: true, months: 12 }, value: 17280, valueBasis: "annual",
    summary: "Condition monitoring with 24 wireless sensors, dashboard and alerts by email and text message.",
    related: { tickets: [], deals: [] },
    scope: "The Contractor provides the Client with the \"BRK Monitor\" condition monitoring service for 24 measuring points on the pump drives.",
    services: "Included are loan sensors, gateway, data transmission, a web portal with trend analysis and alerts when limit values are exceeded. Portal availability is 99.5% averaged over the year.",
    price: "The fee is EUR 60 net per measuring point per month, invoiced annually in advance. Additional measuring points can be added pro rata at any time at the same price.",
    liability: LIABILITY_STANDARD, processing: true,
  }),
  build({
    id: "ctr-1003", number: "V-2022-031", title: "Premium service contract for paper machine PM3", kind: "Service contract",
    direction: "customer", customerId: "org-200", counterparty: "Papierfabrik Rehwinkel AG", counterpartyContact: "Carsten Meißner",
    owner: "Selin Aydın", status: "active", signedOn: "2022-12-19", startsOn: "2023-02-01", endsOn: "2027-01-31",
    notice: { months: 2 }, renewal: { automatic: true, months: 24 }, value: 96000, valueBasis: "annual",
    summary: "Full service for the main and auxiliary drives of PM3 with a 4-hour response time and round-the-clock on-call support.",
    related: { tickets: ["SVC-1042", "SVC-1027"], deals: ["deal-201"] },
    scope: "The subject matter is the servicing of the drive technology of paper machine PM3 at the Rehwinkel site, in particular the main drive of the dryer section, the guide roll drives and the reel drives.",
    services: "The Contractor performs inspection, maintenance and repair, keeps a consignment stock of critical spare parts on site and provides on-call support 24 hours a day, 365 days a year. A quarterly service review with a report takes place.",
    sla: {
      reaction: "4 hours, around the clock",
      restore: "24 hours",
      credit: "If the Contractor exceeds the response time, it credits 5% of the monthly fee per breach, up to a total of 25% of the monthly fee.",
    },
    price: "The service fee is EUR 8,000 net per month. Once a year, with three months' advance notice, the Contractor may adjust the fee in line with the producer price index for industrial products (Destatis).",
    liability: "The Contractor's liability is limited to EUR 250,000 per claim and EUR 500,000 per contract year, except for intent, gross negligence and personal injury. Liability for loss of production is excluded.",
    processing: true,
  }),
  build({
    id: "ctr-1004", number: "V-2024-022", title: "Framework agreement for spare parts 2024-2027", kind: "Framework agreement",
    direction: "customer", customerId: "org-200", counterparty: "Papierfabrik Rehwinkel AG", counterpartyContact: "Florian Hesse",
    owner: "Selin Aydın", status: "active", signedOn: "2024-06-12", startsOn: "2024-07-01", endsOn: "2027-06-30",
    notice: { months: 3 }, renewal: { automatic: false }, value: 140000, valueBasis: "call-off volume",
    summary: "Call-off agreement for gearbox spare parts with fixed prices and guaranteed delivery times.",
    related: { tickets: [], deals: [] },
    scope: "The agreement governs the supply of spare and wear parts for gearboxes and drives of the BK and BS series as listed in the parts list in Annex 1.",
    services: "Stocked parts are delivered within 48 hours, non-stocked parts within four weeks of call-off. The planned call-off volume is EUR 140,000 over the entire term; there is no purchase obligation.",
    price: "The fixed prices in Annex 1 apply until [[2025-06-30]]. Thereafter, prices are adjusted annually on 1 July in line with the producer price index for gears and drive elements; increases above 6% entitle the Client to special termination.",
    liability: LIABILITY_STANDARD,
  }),
  build({
    id: "ctr-1005", number: "V-2021-008", title: "Maintenance contract for milling and conveying plant", kind: "Maintenance contract",
    direction: "customer", customerId: "org-300", counterparty: "Kornfeld Mühlenbetriebe KG", counterpartyContact: "Anja Wiesner",
    owner: "Selin Aydın", status: "active", signedOn: "2021-11-03", startsOn: "2021-12-01", endsOn: "2026-11-30",
    notice: { months: 1 }, renewal: { automatic: true, months: 12 }, value: 21600, valueBasis: "annual",
    summary: "Maintenance of the roller mill and bucket elevator drives, including an annual overhaul during the plant shutdown.",
    related: { tickets: ["SVC-1047"], deals: ["deal-301"] },
    scope: "The subject matter is the maintenance of the drives of six roller mills, two bucket elevators and the silo discharge at the Kornfeld plant.",
    services: "Two maintenance visits per year plus an overhaul during the shutdown between Christmas and New Year. The Client's hygiene rules for food businesses apply; lubricants must be H1-certified.",
    price: "The flat fee is EUR 1,800 net per month. A price adjustment is only possible at the time of renewal and with at least six weeks' advance notice.",
    liability: LIABILITY_STANDARD,
  }),
  build({
    id: "ctr-1006", number: "V-2023-040", title: "Framework agreement for container terminal crane drives", kind: "Framework agreement",
    direction: "customer", customerId: "org-400", counterparty: "Hafenlogistik Nordmarsch GmbH", counterpartyContact: "Henrik Paulsen",
    owner: "Tobias Lindner", status: "active", signedOn: "2024-03-14", startsOn: "2024-04-01", endsOn: "2027-03-31",
    notice: { months: 3 }, renewal: { automatic: false }, value: 210000, valueBasis: "annual",
    summary: "Maintenance, spare parts and exchange drives for six ship-to-shore cranes and twelve gantry cranes.",
    related: { tickets: ["SVC-1044"], deals: ["deal-401"] },
    scope: "The framework agreement covers maintenance, spare parts supply and the exchange of hoist, travel and slewing drives on the cranes of the Nordmarsch container terminal.",
    services: "The Contractor keeps a pool of four exchange gearboxes. The exchange takes place within 36 hours of call-off, including at weekends.",
    sla: {
      reaction: "8 hours, seven days a week",
      restore: "36 hours by exchange from the pool",
      credit: "If the exchange time is exceeded, the Contractor pays a contractual penalty of EUR 1,500 per day or part thereof, up to EUR 15,000 per year.",
    },
    price: "Maintenance work is invoiced on a time and materials basis at the hourly rates in Annex 2; the pool fee is EUR 4,500 net per month. Hourly rates rise annually on 1 April in line with collectively agreed wage rises.",
    liability: LIABILITY_STANDARD,
  }),
  build({
    id: "ctr-1007", number: "V-2026-019", title: "Framework agreement for gate drives (draft)", kind: "Framework agreement",
    direction: "customer", customerId: "org-500", counterparty: "Talsperrenverband Grauenbach", counterpartyContact: "Ingrid Lamprecht",
    owner: "Tobias Lindner", status: "draft", signedOn: null, startsOn: "2027-01-01", endsOn: "2030-12-31",
    notice: { months: 6 }, renewal: { automatic: false }, value: 85000, valueBasis: "annual",
    summary: "Draft from the ongoing tender: replacement and maintenance of the drives for 18 gates and bottom outlets.",
    related: { tickets: [], deals: ["deal-501"] },
    scope: "The subject matter is the supply, installation and maintenance of actuators for weir gates and bottom outlet gates at three of the Client's dams.",
    services: "Replacement of 18 drives in three construction phases by the end of 2028, followed by maintenance and on-call support. The VOB/B and the Client's technical contract conditions apply.",
    price: "Prices are based on the bill of quantities in the tender. A price escalation clause applies only to steel, under the material price escalation clause of form 225.",
    liability: "The statutory provisions and the VOB/B apply. The Contractor provides evidence of public liability insurance with cover of at least EUR 5 million.",
  }),
  build({
    id: "ctr-1008", number: "V-2026-007", title: "BRK Monitor pilot agreement", kind: "Pilot agreement",
    direction: "customer", customerId: "org-600", counterparty: "Sägewerk Fichtelhain GmbH", counterpartyContact: "Bernd Kollmann",
    owner: "Selin Aydın", status: "active", signedOn: "2026-06-02", startsOn: "2026-06-15", endsOn: "2026-12-15",
    notice: null, renewal: { automatic: false }, value: 0, valueBasis: "one-off",
    summary: "Free pilot with eight sensors on the chipper unit; conversion to a subscription possible.",
    related: { tickets: [], deals: ["deal-601"] },
    milestones: [{ date: "2026-11-30", label: "Exercise conversion option" }],
    scope: "The Contractor provides the \"BRK Monitor\" condition monitoring service for eight measuring points on the chipper unit free of charge for the duration of the pilot.",
    services: "Installation and removal of the sensors, access to the web portal, a mid-term review meeting and a final report.",
    extra: [{
      heading: "Conversion option",
      text: "The Client may declare by [[2026-11-30]] that the pilot is to be converted seamlessly into a subscription at EUR 55 per measuring point per month. Without such a declaration, the Contractor removes the sensors after the end of the pilot.",
      tags: ["frist", "preis"],
      important: true,
    }],
    price: "The pilot is free of charge. The Client bears only the costs of power and network connection for the gateway.",
    liability: "During the pilot, liability is limited to intent and gross negligence; personal injury is excepted.",
    processing: true,
  }),
  build({
    id: "ctr-1009", number: "V-2020-012", title: "Service contract for cement line 2 grinding plant", kind: "Service contract",
    direction: "customer", customerId: "org-800", counterparty: "Harzfeld Zement AG", counterpartyContact: "Gerd Stamm",
    owner: "Tobias Lindner", status: "expired", signedOn: "2020-11-30", startsOn: "2021-01-01", endsOn: "2025-12-31",
    notice: { months: 3 }, renewal: { automatic: true, months: 12 }, value: 58000, valueBasis: "annual",
    summary: "Terminated by the customer with due notice as of the end of 2025; the service was awarded to a competitor.",
    related: { tickets: [], deals: ["deal-801"] },
    scope: "Servicing of the main drive of the tube mill and the drives of the clinker conveying system of cement line 2.",
    services: "Maintenance, oil analysis, thermography and repairs on a time and materials basis; the Client's notice of termination was received on [[2025-09-15]].",
    price: "Flat fee of EUR 4,833 net per month plus materials at cost.",
    liability: LIABILITY_STANDARD,
  }),
  build({
    id: "ctr-1010", number: "V-2022-027", title: "Maintenance contract for aeration tank agitators", kind: "Maintenance contract",
    direction: "customer", customerId: "org-900", counterparty: "Zweckverband Klärwerk Mittlere Aue", counterpartyContact: "Martina Oswald",
    owner: "Tobias Lindner", status: "active", signedOn: "2022-08-25", startsOn: "2022-10-01", endsOn: "2027-09-30",
    notice: { months: 6 }, renewal: { automatic: true, months: 12 }, value: 44500, valueBasis: "annual",
    summary: "Maintenance of 16 agitator and blower drives; public-sector client, renewal only after budget approval.",
    related: { tickets: ["SVC-1045"], deals: [] },
    scope: "The subject matter is the maintenance of the agitator and blower drives of aeration tanks 1 to 4 at the Mittlere Aue wastewater treatment plant.",
    services: "Quarterly inspection, annual gear oil analysis, replacement of seals and bearings as required by findings. The VOL/B also applies.",
    sla: {
      reaction: "12 hours on working days",
      restore: "72 hours",
      credit: "No contractual penalty has been agreed; repeated breaches entitle the Client to extraordinary termination.",
    },
    price: "The fee is EUR 44,500 net per year. Price adjustments are excluded; additional costs are invoiced exclusively through change orders.",
    liability: LIABILITY_STANDARD, processing: true,
  }),
  build({
    id: "ctr-1011", number: "V-2026-011", title: "Spare parts framework agreement (draft)", kind: "Framework agreement",
    direction: "customer", customerId: "org-1000", counterparty: "Feinguss Ostheide GmbH", counterpartyContact: "Julia Brenner",
    owner: "Selin Aydın", status: "draft", signedOn: null, startsOn: "2027-01-01", endsOn: "2028-12-31",
    notice: { months: 3 }, renewal: { automatic: true, months: 12 }, value: 60000, valueBasis: "annual",
    summary: "Negotiation status: consignment stock for foundry drives; price escalation and liability cap are still open.",
    related: { tickets: [], deals: ["deal-1001"] },
    scope: "Supply of spare parts and exchange drives for the moulding plant and the sand preparation plant of the Ostheide foundry.",
    services: "Consignment stock at the Client's premises with monthly stock invoicing; delivery time for non-stocked parts three weeks.",
    price: "Draft: fixed prices for twelve months, then adjustment in line with the producer price index. The Client is asking for a cap of 3% per year.",
    liability: "Draft: liability cap of EUR 100,000 per claim. The Client is asking for EUR 500,000.",
  }),
  build({
    id: "ctr-1012", number: "V-2024-005", title: "Service contract for shredder drives with 8h SLA", kind: "Service contract",
    direction: "customer", customerId: "org-1100", counterparty: "Haselgrund Recycling GmbH", counterpartyContact: "Michael Kessling",
    owner: "Tobias Lindner", status: "active", signedOn: "2024-02-08", startsOn: "2024-03-01", endsOn: "2027-02-28",
    notice: { months: 3 }, renewal: { automatic: true, months: 12 }, value: 52800, valueBasis: "annual",
    summary: "Servicing of two pre-shredders and the trommel screen, with a replacement gearbox in the pool.",
    related: { tickets: ["SVC-1041"], deals: ["deal-1101"] },
    scope: "The subject matter is the servicing of the drives of pre-shredders V1 and V2 and the trommel screen at the Haselgrund recycling centre.",
    services: "Monthly inspection, oil service, repairs on a time and materials basis and provision of a replacement gearbox in the pool.",
    sla: {
      reaction: "8 hours on working days",
      restore: "48 hours",
      credit: "For each time the response time is exceeded, the Contractor credits EUR 250.",
    },
    price: "The flat fee is EUR 4,400 net per month. Adjusted annually on 1 March in line with collectively agreed wage trends, by no more than 4%.",
    liability: LIABILITY_STANDARD,
  }),
  build({
    id: "ctr-1013", number: "V-2026-024", title: "Supply contract for second shredder drive", kind: "Supply contract",
    direction: "customer", customerId: "org-1100", counterparty: "Haselgrund Recycling GmbH", counterpartyContact: "Michael Kessling",
    owner: "Tobias Lindner", status: "active", signedOn: "2026-09-24", startsOn: "2026-10-01", endsOn: "2027-03-31",
    notice: null, renewal: { automatic: false }, value: 186000, valueBasis: "one-off",
    summary: "Supply and commissioning of a planetary gearbox with drive motor for the new pre-shredder V3.",
    related: { tickets: [], deals: ["deal-1101"] },
    milestones: [{ date: "2027-02-15", label: "Delivery date" }],
    scope: "Supply, installation and commissioning of a BP-900 planetary gearbox with a 400 kW drive motor and frequency converter for pre-shredder V3.",
    services: "Design of the adapter, delivery free to site, installation supervision, commissioning and instruction of up to eight people.",
    extra: [
      {
        heading: "Dates and acceptance",
        text: "The delivery date is [[2027-02-15]]. Acceptance takes place after a fault-free trial run of 72 hours. In the event of late delivery, the Contractor pays 0.2% of the order value per working day, up to a maximum of 5%.",
        tags: ["frist", "abnahme", "haftung"],
        important: true,
      },
      {
        heading: "Payment schedule",
        text: "30% on order confirmation, 60% on delivery, 10% after acceptance. Warranty of 24 months from acceptance.",
        tags: ["preis"],
      },
    ],
    price: "Fixed price of EUR 186,000 net. Price adjustments are excluded.",
    liability: LIABILITY_STANDARD,
  }),
  build({
    id: "ctr-2001", number: "E-2022-004", title: "Software licence for ERP \"Belegwerk\"", kind: "Software licence agreement",
    direction: "supplier", customerId: null, counterparty: "Belegwerk Software GmbH", counterpartyContact: null,
    owner: "Erik Thalmann", status: "active", signedOn: "2022-11-28", startsOn: "2023-01-01", endsOn: "2026-12-31",
    notice: { months: 3 }, renewal: { automatic: true, months: 12 }, value: 28900, valueBasis: "annual",
    summary: "ERP licences for 85 users including maintenance; a price increase of 4.5% has been announced for 2027.",
    related: { tickets: ["IT-312"], deals: [] },
    scope: "Right to use the ERP software \"Belegwerk\" for 85 named users, including software maintenance and hotline.",
    services: "Updates and security fixes, hotline on working days from 8 am to 5 pm, operation in the Licensor's cloud with 99.5% availability.",
    price: "The annual fee is EUR 28,900 net. At the time of renewal, the Licensor may increase the fee by up to 5% with three months' advance notice.",
    liability: "The Licensor's liability is limited to the annual fee, except for intent, gross negligence and personal injury.",
    processing: true,
  }),
  build({
    id: "ctr-2002", number: "E-2023-011", title: "Lease of service vehicles (12 vans)", kind: "Lease agreement",
    direction: "supplier", customerId: null, counterparty: "Kurbelstein Flottenleasing GmbH", counterpartyContact: null,
    owner: "Markus Feldmann", status: "active", signedOn: "2023-01-10", startsOn: "2023-02-01", endsOn: "2027-01-31",
    notice: null, renewal: { automatic: false }, value: 64800, valueBasis: "annual",
    summary: "Mileage-based lease for 12 service vans; replacement vehicles have a delivery time of four months.",
    related: { tickets: [], deals: [] },
    milestones: [{ date: "2026-10-31", label: "Order follow-on lease" }],
    scope: "Lease of twelve vans with workshop fit-out for the field service, mileage of 35,000 km per vehicle per year.",
    services: "Maintenance, tyres and insurance are included. Excess and unused kilometres are charged or credited at 8 cents per kilometre.",
    extra: [{
      heading: "Return and follow-on lease",
      text: "The vehicles must be returned to the Kassel site at the end of the contract. For the follow-on lease to start seamlessly, the order must reach the Lessor by [[2026-10-31]].",
      tags: ["frist"],
      important: true,
    }],
    price: "The lease rate is EUR 450 net per vehicle per month, fixed for the term.",
    liability: "The Lessor's general leasing terms and conditions as amended on [[2022-09-01]] apply.",
  }),
  build({
    id: "ctr-2003", number: "E-2024-002", title: "Routine cleaning of Kassel plant", kind: "Service agreement",
    direction: "supplier", customerId: null, counterparty: "Reinhaus Gebäudedienste GmbH", counterpartyContact: null,
    owner: "Paul Reinholz", status: "active", signedOn: "2024-11-18", startsOn: "2025-01-01", endsOn: "2026-12-31",
    notice: { weeks: 6 }, renewal: { automatic: true, months: 12 }, value: 31200, valueBasis: "annual",
    summary: "Routine cleaning of offices, staff facilities and workshop areas; quality has recently been criticised several times.",
    related: { tickets: [], deals: [] },
    scope: "Routine cleaning of the office and staff areas (2,100 m²) and deep cleaning of the workshop floors at the Kassel plant.",
    services: "Offices and sanitary facilities every working day, workshop floors monthly, window cleaning twice a year. Defects must be remedied within 24 hours.",
    price: "The monthly fee is EUR 2,600 net. Adjustments are permitted if the minimum wage in the building cleaning sector changes.",
    liability: "The Contractor is liable for damage in accordance with the statutory provisions and provides evidence of liability insurance of EUR 3 million.",
  }),
  build({
    id: "ctr-2004", number: "E-2021-001", title: "Lease of warehouse, Plant 2", kind: "Tenancy agreement",
    direction: "supplier", customerId: null, counterparty: "Hallenvermietung Ostring GbR", counterpartyContact: null,
    owner: "Paul Reinholz", status: "active", signedOn: "2021-04-22", startsOn: "2021-07-01", endsOn: "2031-06-30",
    notice: { months: 12 }, renewal: { automatic: true, months: 60 }, value: 96000, valueBasis: "annual",
    summary: "Commercial lease for 3,200 m² of storage space with index-linked rent.",
    related: { tickets: [], deals: [] },
    scope: "The lease covers the Ostring 9 warehouse with 3,200 m² of floor space, 40 outdoor parking spaces and a crane runway with a 10 t load capacity.",
    services: "The Landlord is responsible for maintaining the roof and structure; the Tenant bears cosmetic repairs and the maintenance of the crane runway.",
    price: "The net rent excluding service charges is EUR 8,000 per month. It changes annually in proportion to the consumer price index (index-linked rent under section 557b of the German Civil Code, BGB).",
    liability: "The statutory provisions of tenancy law apply.",
  }),
  build({
    id: "ctr-2005", number: "E-2024-009", title: "Electricity supply contract 2025-2026", kind: "Energy supply contract",
    direction: "supplier", customerId: null, counterparty: "Fernstrom Ellertal GmbH", counterpartyContact: null,
    owner: "Paul Reinholz", status: "active", signedOn: "2024-10-07", startsOn: "2025-01-01", endsOn: "2026-12-31",
    notice: null, renewal: { automatic: false }, value: 182000, valueBasis: "annual",
    summary: "Fixed-price contract for 1.1 GWh per year; without a follow-on contract, the site falls into default supply from 2027.",
    related: { tickets: [], deals: [] },
    scope: "Supply of electrical energy to the Kassel plant and the Plant 2 warehouse, planned quantity 1.1 GWh per year.",
    services: "Full supply with 100% green electricity from installations in the EU, with annual guarantees of origin.",
    price: "Fixed price of 16.5 ct/kWh net plus grid charges, levies and electricity tax. Excess or shortfall quantities above 10% are invoiced at the exchange price.",
    liability: "Liability for supply interruptions is governed by section 18 of the German Low Voltage Connection Ordinance (NAV).",
  }),
];
