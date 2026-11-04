// English version of data.ts: ticket system of Brakenstedt Antriebstechnik GmbH
// (invented). SVC is customer service, IT is internal. customerId and contractId
// point into the CRM and the contract register. Timestamps are written as of
// 28 October 2026 and move by whole days with the calendar. Ticket type, status
// and priority (also in status events) stay German: code filters and sorts on them.

import type { Ticket } from "./data.js";

export type { Event, Ticket } from "./data.js";

export const TEAM = [
  { name: "Markus Feldmann", role: "Head of Service" },
  { name: "Lea Brandt", role: "Service Dispatch" },
  { name: "Konstantin Weber", role: "Service Technician" },
  { name: "Mirela Kovač", role: "Service Technician" },
  { name: "Erik Thalmann", role: "IT" },
];

export const TICKETS: Ticket[] = [
  {
    key: "SVC-1042", type: "Störung", summary: "PM3 dryer section main drive: bearing temperature rising above 85 °C",
    status: "In Arbeit", priority: "Kritisch", assignee: "Konstantin Weber", reporter: "Ute Blum",
    customerId: "org-200", customer: "Papierfabrik Rehwinkel AG", contractId: "ctr-1003", asset: "PM3 · Main drive BK-710 · Serial no. 21-4471",
    created: "2026-10-27T15:10:00+01:00", updated: "2026-10-28T08:05:00+01:00",
    sla: { respondBy: "2026-10-27T19:10:00+01:00", respondedAt: "2026-10-27T15:52:00+01:00", resolveBy: "2026-10-28T15:10:00+01:00" },
    visit: { at: "2026-10-28T07:00:00+01:00", technician: "Konstantin Weber" },
    labels: ["PM3", "On-call", "Bearing"],
    description: "Since yesterday lunchtime, the temperature at the drive-end bearing of the dryer section main drive has risen from 68 °C to currently 87 °C. Vibration levels slightly elevated. The machine is running at reduced speed (-15%). According to the customer, downtime costs around EUR 18,000 per hour.",
    history: [
      { at: "2026-10-27T15:10:00+01:00", author: "Ute Blum", kind: "created" },
      { at: "2026-10-27T15:52:00+01:00", author: "Lea Brandt", kind: "assign", to: "Konstantin Weber" },
      { at: "2026-10-27T15:53:00+01:00", author: "Lea Brandt", kind: "comment", text: "Called Ms Blum back: speed reduced, temperature is logged hourly. Visit confirmed for tomorrow at 7:00." },
      { at: "2026-10-27T21:30:00+01:00", author: "Ute Blum", kind: "comment", text: "Temperature now 84 °C, rising more slowly. We are holding the speed." },
      { at: "2026-10-28T07:20:00+01:00", author: "Konstantin Weber", kind: "status", from: "Offen", to: "In Arbeit" },
      { at: "2026-10-28T08:05:00+01:00", author: "Konstantin Weber", kind: "comment", text: "On site. Took an oil sample: lubricant noticeably dark, particles visible. Suspect early-stage bearing damage. Replacement bearing is in the consignment stock, swap takes about 6 hours during a shutdown. Agreeing the shutdown window with Ms Blum.", internal: false },
      { at: "2026-10-28T08:12:00+01:00", author: "Markus Feldmann", kind: "comment", text: "The restoration SLA ends today at 15:10. If the customer only approves the shutdown for tonight, please get it confirmed in writing so the deadline extension is documented.", internal: true },
    ],
  },
  {
    key: "SVC-1047", type: "Wartung", summary: "Schedule annual overhaul of roller mills during the plant shutdown",
    status: "Geplant", priority: "Mittel", assignee: "Mirela Kovač", reporter: "Lea Brandt",
    customerId: "org-300", customer: "Kornfeld Mühlenbetriebe KG", contractId: "ctr-1005", asset: "Roller mills WS1-WS6",
    created: "2026-10-12T10:15:00+02:00", updated: "2026-10-21T14:40:00+02:00",
    sla: null, visit: null,
    labels: ["Overhaul", "H1 lubricant"],
    description: "Overhaul under the maintenance contract during the shutdown between Christmas and New Year. Two technicians, three days. Note: the maintenance contract ends before the overhaul; it is only covered if the contract is renewed.",
    history: [
      { at: "2026-10-12T10:15:00+02:00", author: "Lea Brandt", kind: "created" },
      { at: "2026-10-12T10:16:00+02:00", author: "Lea Brandt", kind: "assign", to: "Mirela Kovač" },
      { at: "2026-10-21T14:40:00+02:00", author: "Lea Brandt", kind: "status", from: "Offen", to: "Geplant" },
      { at: "2026-10-21T14:41:00+02:00", author: "Lea Brandt", kind: "comment", text: "Date during the shutdown between Christmas and New Year agreed with Mr Kornfeld. Asked Selin Aydın about the contract renewal.", internal: true },
    ],
  },
  {
    key: "SVC-1045", type: "Störung", summary: "Treatment plant tank 2: agitator 3 running noisily",
    status: "Geplant", priority: "Hoch", assignee: "Mirela Kovač", reporter: "Martina Oswald",
    customerId: "org-900", customer: "Zweckverband Klärwerk Mittlere Aue", contractId: "ctr-1010", asset: "Aeration tank 2 · Agitator RW3",
    created: "2026-10-26T09:20:00+01:00", updated: "2026-10-26T11:05:00+01:00",
    sla: { respondBy: "2026-10-26T21:20:00+01:00", respondedAt: "2026-10-26T10:02:00+01:00", resolveBy: "2026-10-29T09:20:00+01:00" },
    visit: { at: "2026-10-29T08:00:00+01:00", technician: "Mirela Kovač" },
    labels: ["Bearing", "Noise"],
    description: "Grinding noise from agitator 3 since the weekend. The plant is running; the operator has switched to the standby agitator.",
    history: [
      { at: "2026-10-26T09:20:00+01:00", author: "Martina Oswald", kind: "created" },
      { at: "2026-10-26T10:02:00+01:00", author: "Markus Feldmann", kind: "comment", text: "Phone call with Ms Oswald. Visit on Thursday at 8:00, bringing a replacement bearing." },
      { at: "2026-10-26T11:05:00+01:00", author: "Lea Brandt", kind: "status", from: "Offen", to: "Geplant" },
    ],
  },
  {
    key: "SVC-1044", type: "Serviceanfrage", summary: "Request exchange gearbox from the pool for gantry crane 7",
    status: "In Arbeit", priority: "Hoch", assignee: "Konstantin Weber", reporter: "Katrin Lüders",
    customerId: "org-400", customer: "Hafenlogistik Nordmarsch GmbH", contractId: "ctr-1006", asset: "Gantry crane 7 · Travel drive left",
    created: "2026-10-27T06:45:00+01:00", updated: "2026-10-28T07:30:00+01:00",
    sla: { respondBy: "2026-10-27T14:45:00+01:00", respondedAt: "2026-10-27T07:20:00+01:00", resolveBy: "2026-10-28T18:45:00+01:00" },
    visit: { at: "2026-10-28T13:00:00+01:00", technician: "Konstantin Weber" },
    labels: ["Pool", "Exchange"],
    description: "Left travel gearbox is leaking oil, crane only partly usable. Exchange from the pool under the framework agreement (36 hours).",
    history: [
      { at: "2026-10-27T06:45:00+01:00", author: "Katrin Lüders", kind: "created" },
      { at: "2026-10-27T07:20:00+01:00", author: "Lea Brandt", kind: "assign", to: "Konstantin Weber" },
      { at: "2026-10-27T07:21:00+01:00", author: "Lea Brandt", kind: "status", from: "Offen", to: "In Arbeit" },
      { at: "2026-10-27T16:00:00+01:00", author: "Lea Brandt", kind: "comment", text: "Pool gearbox BS-420 picked, the carrier collects it tomorrow at 6:00." },
      { at: "2026-10-28T07:30:00+01:00", author: "Lea Brandt", kind: "comment", text: "Gearbox in transit, arriving around 12:30. Installation from 13:00." },
    ],
  },
  {
    key: "SVC-1041", type: "Störung", summary: "Pre-shredder V2: gearbox jammed by foreign object",
    status: "Wartet auf Kunde", priority: "Hoch", assignee: "Mirela Kovač", reporter: "Svenja Rohde",
    customerId: "org-1100", customer: "Haselgrund Recycling GmbH", contractId: "ctr-1012", asset: "Pre-shredder V2 · Planetary gearbox BP-640",
    created: "2026-10-23T13:05:00+02:00", updated: "2026-10-26T16:20:00+01:00",
    sla: { respondBy: "2026-10-23T21:05:00+02:00", respondedAt: "2026-10-23T14:10:00+02:00", resolveBy: "2026-10-25T13:05:00+02:00" },
    visit: null,
    labels: ["Foreign object", "Check warranty"],
    description: "A steel part in the feed material jammed V2. Gearbox removed, tooth flanks of the second stage damaged. Repair at the Kassel plant; a replacement gearbox from the pool has been running since the following day.",
    history: [
      { at: "2026-10-23T13:05:00+02:00", author: "Svenja Rohde", kind: "created" },
      { at: "2026-10-23T14:10:00+02:00", author: "Markus Feldmann", kind: "assign", to: "Mirela Kovač" },
      { at: "2026-10-24T11:30:00+02:00", author: "Mirela Kovač", kind: "comment", text: "Pool gearbox installed, V2 running again. Defective gearbox goes to the plant." },
      { at: "2026-10-26T16:20:00+01:00", author: "Mirela Kovač", kind: "comment", text: "Findings: damage caused by a foreign object, not covered by warranty. Repair estimate of EUR 14,200 sent to Ms Rohde, approval pending." },
      { at: "2026-10-26T16:21:00+01:00", author: "Mirela Kovač", kind: "status", from: "In Arbeit", to: "Wartet auf Kunde" },
    ],
  },
  {
    key: "SVC-1038", type: "Wartung", summary: "Autumn maintenance, South pumping station",
    status: "Erledigt", priority: "Niedrig", assignee: "Konstantin Weber", reporter: "Lea Brandt",
    customerId: "org-100", customer: "Stadtwerke Lohmbach GmbH", contractId: "ctr-1001", asset: "South pumping station · 6 drives",
    created: "2026-10-01T08:00:00+02:00", updated: "2026-10-22T15:30:00+02:00",
    sla: null, visit: { at: "2026-10-20T07:30:00+02:00", technician: "Konstantin Weber" },
    labels: ["Maintenance", "Oil analysis"],
    description: "Scheduled autumn maintenance with vibration measurement and oil change.",
    history: [
      { at: "2026-10-01T08:00:00+02:00", author: "Lea Brandt", kind: "created" },
      { at: "2026-10-20T16:10:00+02:00", author: "Konstantin Weber", kind: "comment", text: "Maintenance completed. Pump P4: vibration at the limit, recommend replacing the bearing at the spring maintenance." },
      { at: "2026-10-22T15:30:00+02:00", author: "Lea Brandt", kind: "status", from: "In Arbeit", to: "Erledigt" },
    ],
  },
  {
    key: "SVC-1027", type: "Reklamation", summary: "Response time exceeded in August: credit note requested",
    status: "Erledigt", priority: "Mittel", assignee: "Markus Feldmann", reporter: "Florian Hesse",
    customerId: "org-200", customer: "Papierfabrik Rehwinkel AG", contractId: "ctr-1003", asset: "PM3 · Guide roll drive",
    created: "2026-08-18T09:00:00+02:00", updated: "2026-09-02T11:00:00+02:00",
    sla: null, visit: null,
    labels: ["SLA", "Credit note"],
    description: "The customer complains about a response time of 4:25 h for a night-time fault and requests the contractual credit note.",
    history: [
      { at: "2026-08-18T09:00:00+02:00", author: "Florian Hesse", kind: "created" },
      { at: "2026-08-20T10:30:00+02:00", author: "Markus Feldmann", kind: "comment", text: "Log checked: reported at 22:05, call back at 02:30. Breach confirmed. Credit note of 5% of the monthly fee (EUR 400) issued." },
      { at: "2026-09-02T11:00:00+02:00", author: "Markus Feldmann", kind: "status", from: "In Arbeit", to: "Erledigt" },
    ],
  },
  {
    key: "SVC-1046", type: "Serviceanfrage", summary: "Quote for sensors at 12 additional measuring points",
    status: "Offen", priority: "Niedrig", assignee: null, reporter: "Bernd Kollmann",
    customerId: "org-600", customer: "Sägewerk Fichtelhain GmbH", contractId: "ctr-1008", asset: "Chipper unit line 1",
    created: "2026-10-24T10:40:00+02:00", updated: "2026-10-24T10:40:00+02:00",
    sla: null, visit: null, labels: ["BRK Monitor", "Sales"],
    description: "Mr Kollmann asks for a technical check whether the sensors on line 2 can be connected without a new gateway.",
    history: [{ at: "2026-10-24T10:40:00+02:00", author: "Bernd Kollmann", kind: "created" }],
  },
  {
    key: "SVC-1043", type: "Störung", summary: "Pre-dam gate actuator: limit switch not working",
    status: "Offen", priority: "Mittel", assignee: null, reporter: "Ingrid Lamprecht",
    customerId: "org-500", customer: "Talsperrenverband Grauenbach", contractId: null, asset: "Pre-dam · Bottom outlet GA2",
    created: "2026-10-27T11:15:00+01:00", updated: "2026-10-27T11:15:00+01:00",
    sla: null, visit: null, labels: ["No contract", "Tender"],
    description: "No maintenance contract. Request for a visit on a time-and-materials basis. Note: tender in progress, ensure equal treatment.",
    history: [
      { at: "2026-10-27T11:15:00+01:00", author: "Ingrid Lamprecht", kind: "created" },
      { at: "2026-10-27T12:00:00+01:00", author: "Markus Feldmann", kind: "comment", text: "Before committing, check with Sales (Tobias Lindner) and Legal whether a visit is permitted while the tender is running.", internal: true },
    ],
  },
  {
    key: "SVC-1040", type: "Serviceanfrage", summary: "BRK Monitor training for the maintenance team",
    status: "Geplant", priority: "Niedrig", assignee: "Markus Feldmann", reporter: "Dirk Ahlers",
    customerId: "org-100", customer: "Stadtwerke Lohmbach GmbH", contractId: "ctr-1002", asset: null,
    created: "2026-10-15T13:00:00+02:00", updated: "2026-10-19T09:10:00+02:00",
    sla: null, visit: { at: "2026-11-12T09:00:00+01:00", technician: "Markus Feldmann" },
    labels: ["Training"], description: "Half-day training for six people on alarm rules and trend analysis.",
    history: [
      { at: "2026-10-15T13:00:00+02:00", author: "Dirk Ahlers", kind: "created" },
      { at: "2026-10-19T09:10:00+02:00", author: "Markus Feldmann", kind: "status", from: "Offen", to: "Geplant" },
    ],
  },
  {
    key: "SVC-1039", type: "Reklamation", summary: "Oil leak on bucket elevator 2 after maintenance",
    status: "Erledigt", priority: "Hoch", assignee: "Mirela Kovač", reporter: "Ralf Kornfeld",
    customerId: "org-300", customer: "Kornfeld Mühlenbetriebe KG", contractId: "ctr-1005", asset: "Bucket elevator BW2",
    created: "2026-10-06T07:30:00+02:00", updated: "2026-10-07T15:00:00+02:00",
    sla: null, visit: null, labels: ["Rework", "Hygiene"],
    description: "Since the autumn maintenance, oil has been dripping from the output shaft. Food production area, immediate rework requested.",
    history: [
      { at: "2026-10-06T07:30:00+02:00", author: "Ralf Kornfeld", kind: "created" },
      { at: "2026-10-06T11:00:00+02:00", author: "Mirela Kovač", kind: "comment", text: "Shaft seal damaged during installation. Replaced, area cleaned, topped up with H1 lubricant. Free of charge as rework." },
      { at: "2026-10-07T15:00:00+02:00", author: "Lea Brandt", kind: "status", from: "In Arbeit", to: "Erledigt" },
    ],
  },
  {
    key: "IT-312", type: "IT-Anfrage", summary: "ERP Belegwerk: check 2027 price increase and notice period",
    status: "Offen", priority: "Mittel", assignee: "Erik Thalmann", reporter: "Paul Reinholz",
    customerId: null, customer: null, contractId: "ctr-2001", asset: "ERP Belegwerk",
    created: "2026-10-05T09:30:00+02:00", updated: "2026-10-05T09:30:00+02:00",
    sla: null, visit: null, labels: ["Licence", "Purchasing"],
    description: "Belegwerk announces a 4.5% price increase for 2027. Check whether the announcement was made in time and whether we can reduce users (actively used: 71 of 85).",
    history: [{ at: "2026-10-05T09:30:00+02:00", author: "Paul Reinholz", kind: "created" }],
  },
  {
    key: "IT-318", type: "IT-Anfrage", summary: "Tablets for service technicians: make the ticket app usable offline",
    status: "In Arbeit", priority: "Mittel", assignee: "Erik Thalmann", reporter: "Markus Feldmann",
    customerId: null, customer: null, contractId: null, asset: null,
    created: "2026-10-19T08:15:00+02:00", updated: "2026-10-26T17:00:00+01:00",
    sla: null, visit: null, labels: ["Field service"],
    description: "Pumping stations and basements often have no signal. Technicians need to read tickets and file reports offline.",
    history: [
      { at: "2026-10-19T08:15:00+02:00", author: "Markus Feldmann", kind: "created" },
      { at: "2026-10-26T17:00:00+01:00", author: "Erik Thalmann", kind: "comment", text: "Enabled the app's offline mode, testing with Konstantin Weber next week." },
    ],
  },
];
