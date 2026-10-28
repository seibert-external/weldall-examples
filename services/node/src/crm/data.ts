// CRM of Brakenstedt Antriebstechnik GmbH (invented). Organisation IDs are the
// customerId values in the contract register; contractIds point back.
// Dates are written as of October 2026 and move with the calendar.

export const STAGES = [
  { id: "qualifizierung", label: "Qualifizierung", probability: 10 },
  { id: "bedarfsanalyse", label: "Bedarfsanalyse", probability: 25 },
  { id: "angebot", label: "Angebot", probability: 50 },
  { id: "verhandlung", label: "Verhandlung", probability: 75 },
  { id: "gewonnen", label: "Gewonnen", probability: 100 },
  { id: "verloren", label: "Verloren", probability: 0 },
] as const;

export type Stage = (typeof STAGES)[number]["id"];

export const TEAM = [
  { name: "Jana Hartwig", role: "Leiterin Vertrieb", email: "jana.hartwig@brakenstedt.example" },
  { name: "Tobias Lindner", role: "Key Account Manager Nord", email: "tobias.lindner@brakenstedt.example" },
  { name: "Selin Aydın", role: "Key Account Managerin Süd", email: "selin.aydin@brakenstedt.example" },
  { name: "Markus Feldmann", role: "Leiter Service", email: "markus.feldmann@brakenstedt.example" },
];

export const ORGANIZATIONS = [
  {
    id: "org-100", name: "Stadtwerke Lohmbach GmbH", industry: "Energie und Wasser", status: "customer",
    city: "Lohmbach", employees: 420, owner: "Tobias Lindner", customerSince: "2019-04-01",
    website: "https://stadtwerke-lohmbach.example", annualRevenue: 55680,
    contractIds: ["ctr-1001", "ctr-1002"],
    notes: "Zwei Pumpwerke, 14 Antriebe. Entscheidungen über den Werkausschuss, Budgetplanung im September.",
  },
  {
    id: "org-200", name: "Papierfabrik Rehwinkel AG", industry: "Papier und Verpackung", status: "customer",
    city: "Rehwinkel", employees: 1150, owner: "Selin Aydın", customerSince: "2016-09-01",
    website: "https://papierfabrik-rehwinkel.example", annualRevenue: 142000,
    contractIds: ["ctr-1003", "ctr-1004"],
    notes: "Größter Servicekunde. PM3 läuft 24/7; jeder Stillstand kostet laut Kunde rund 18.000 € pro Stunde.",
  },
  {
    id: "org-300", name: "Kornfeld Mühlenbetriebe KG", industry: "Lebensmittel", status: "customer",
    city: "Wettenau", employees: 160, owner: "Selin Aydın", customerSince: "2021-12-01",
    website: "https://kornfeld-muehle.example", annualRevenue: 21600,
    contractIds: ["ctr-1005"],
    notes: "Familienbetrieb in dritter Generation. Hygieneanforderungen beachten (H1-Schmierstoffe).",
  },
  {
    id: "org-400", name: "Hafenlogistik Nordmarsch GmbH", industry: "Logistik", status: "customer",
    city: "Nordmarsch", employees: 780, owner: "Tobias Lindner", customerSince: "2020-03-15",
    website: "https://hafen-nordmarsch.example", annualRevenue: 210000,
    contractIds: ["ctr-1006"],
    notes: "Sechs Containerbrücken, zwölf Portalkrane. Rahmenvertrag endet März 2027 ohne Verlängerung.",
  },
  {
    id: "org-500", name: "Talsperrenverband Grauenbach", industry: "Öffentliche Wasserwirtschaft", status: "prospect",
    city: "Grauenbach", employees: 95, owner: "Tobias Lindner", customerSince: null,
    website: "https://talsperren-grauenbach.example", annualRevenue: 0,
    contractIds: ["ctr-1007"],
    notes: "Öffentliche Ausschreibung nach VOB/A, Angebotsfrist beachten. Vergabe nach Wirtschaftlichkeit (Preis 60 %, Technik 40 %).",
  },
  {
    id: "org-600", name: "Sägewerk Fichtelhain GmbH", industry: "Holzverarbeitung", status: "prospect",
    city: "Fichtelhain", employees: 210, owner: "Selin Aydın", customerSince: null,
    website: "https://saegewerk-fichtelhain.example", annualRevenue: 0,
    contractIds: ["ctr-1008"],
    notes: "Pilot BRK Monitor seit Juni. Erste Lagerwarnung im August hat einen Ausfall verhindert.",
  },
  {
    id: "org-700", name: "Brauhaus Ellerbrook KG", industry: "Getränke", status: "lead",
    city: "Ellerbrook", employees: 85, owner: "Selin Aydın", customerSince: null,
    website: "https://brauhaus-ellerbrook.example", annualRevenue: 0,
    contractIds: [],
    notes: "Kontakt über die Messe „Antrieb und Prozess“. Neues Sudhaus geplant.",
  },
  {
    id: "org-800", name: "Harzfeld Zement AG", industry: "Baustoffe", status: "churned",
    city: "Harzfeld", employees: 640, owner: "Tobias Lindner", customerSince: "2017-01-01",
    website: "https://harzfeld-zement.example", annualRevenue: 0,
    contractIds: ["ctr-1009"],
    notes: "Service zum Jahresende 2025 an einen Wettbewerber verloren (Preis). Kontakt halten, Rückgewinnung 2027 möglich.",
  },
  {
    id: "org-900", name: "Zweckverband Klärwerk Mittlere Aue", industry: "Abwasser", status: "customer",
    city: "Auenstedt", employees: 60, owner: "Tobias Lindner", customerSince: "2022-10-01",
    website: "https://klaerwerk-mittlere-aue.example", annualRevenue: 44500,
    contractIds: ["ctr-1010"],
    notes: "Öffentlicher Auftraggeber, Haushaltsjahr = Kalenderjahr. Freigaben über die Verbandsversammlung.",
  },
  {
    id: "org-1000", name: "Feinguss Ostheide GmbH", industry: "Metallverarbeitung", status: "prospect",
    city: "Ostheide", employees: 330, owner: "Selin Aydın", customerSince: null,
    website: "https://feinguss-ostheide.example", annualRevenue: 0,
    contractIds: ["ctr-1011"],
    notes: "Bisher Ersatzteile über Händler. Will Konsignationslager, verhandelt hart über Haftung.",
  },
  {
    id: "org-1100", name: "Haselgrund Recycling GmbH", industry: "Entsorgung und Recycling", status: "customer",
    city: "Haselgrund", employees: 240, owner: "Tobias Lindner", customerSince: "2024-03-01",
    website: "https://haselgrund-recycling.example", annualRevenue: 238800,
    contractIds: ["ctr-1012", "ctr-1013"],
    notes: "Wächst stark. Zweiter Schredderantrieb im September gewonnen; Inbetriebnahme Februar.",
  },
  {
    id: "org-1200", name: "Bergbahnen Kargrat GmbH", industry: "Tourismus", status: "prospect",
    city: "Kargrat", employees: 120, owner: "Selin Aydın", customerSince: null,
    website: "https://bergbahnen-kargrat.example", annualRevenue: 0,
    contractIds: [],
    notes: "Revision der Sesselbahn muss vor Saisonstart abgeschlossen sein. Entscheidet der Geschäftsführer allein.",
  },
];

export const CONTACTS = [
  { id: "person-100", organizationId: "org-100", name: "Dirk Ahlers", role: "Leiter Netzbetrieb", email: "d.ahlers@stadtwerke-lohmbach.example" },
  { id: "person-101", organizationId: "org-100", name: "Sabine Kröger", role: "Einkauf", email: "s.kroeger@stadtwerke-lohmbach.example" },
  { id: "person-200", organizationId: "org-200", name: "Carsten Meißner", role: "Technischer Leiter", email: "carsten.meissner@papierfabrik-rehwinkel.example" },
  { id: "person-201", organizationId: "org-200", name: "Ute Blum", role: "Leiterin Instandhaltung PM3", email: "ute.blum@papierfabrik-rehwinkel.example" },
  { id: "person-202", organizationId: "org-200", name: "Florian Hesse", role: "Strategischer Einkauf", email: "florian.hesse@papierfabrik-rehwinkel.example" },
  { id: "person-300", organizationId: "org-300", name: "Anja Wiesner", role: "Geschäftsführerin", email: "a.wiesner@kornfeld-muehle.example" },
  { id: "person-301", organizationId: "org-300", name: "Ralf Kornfeld", role: "Betriebsleiter", email: "r.kornfeld@kornfeld-muehle.example" },
  { id: "person-400", organizationId: "org-400", name: "Henrik Paulsen", role: "Leiter Technik", email: "henrik.paulsen@hafen-nordmarsch.example" },
  { id: "person-401", organizationId: "org-400", name: "Katrin Lüders", role: "Einkauf Instandhaltung", email: "katrin.lueders@hafen-nordmarsch.example" },
  { id: "person-500", organizationId: "org-500", name: "Ingrid Lamprecht", role: "Fachbereichsleiterin Anlagen", email: "i.lamprecht@talsperren-grauenbach.example" },
  { id: "person-600", organizationId: "org-600", name: "Bernd Kollmann", role: "Werkleiter", email: "b.kollmann@saegewerk-fichtelhain.example" },
  { id: "person-700", organizationId: "org-700", name: "Thomas Ellerbrook", role: "Braumeister und Inhaber", email: "thomas@brauhaus-ellerbrook.example" },
  { id: "person-800", organizationId: "org-800", name: "Gerd Stamm", role: "Werksleiter", email: "g.stamm@harzfeld-zement.example" },
  { id: "person-900", organizationId: "org-900", name: "Martina Oswald", role: "Betriebsleiterin Kläranlage", email: "m.oswald@klaerwerk-mittlere-aue.example" },
  { id: "person-1000", organizationId: "org-1000", name: "Julia Brenner", role: "Leiterin Einkauf", email: "j.brenner@feinguss-ostheide.example" },
  { id: "person-1100", organizationId: "org-1100", name: "Michael Kessling", role: "Geschäftsführer", email: "michael.kessling@haselgrund-recycling.example" },
  { id: "person-1101", organizationId: "org-1100", name: "Svenja Rohde", role: "Betriebsleiterin", email: "svenja.rohde@haselgrund-recycling.example" },
  { id: "person-1200", organizationId: "org-1200", name: "Matthias Ortner", role: "Geschäftsführer", email: "m.ortner@bergbahnen-kargrat.example" },
];

export const ACTIVITIES = [
  { id: "act-1", organizationId: "org-200", date: "2026-10-27", type: "call", by: "Selin Aydın", contactId: "person-201", summary: "Ute Blum meldet erneut Temperaturanstieg am Hauptantrieb PM3. Ticket SVC-1042 eröffnet, Techniker für morgen früh eingeplant." },
  { id: "act-2", organizationId: "org-200", date: "2026-10-14", type: "meeting", by: "Selin Aydın", contactId: "person-200", summary: "Quartalsgespräch: Herr Meißner will die Modernisierung des Rollenantriebs vor der Revision im März entscheiden. Wünscht Angebot mit Finanzierungsoption." },
  { id: "act-3", organizationId: "org-200", date: "2026-09-30", type: "email", by: "Selin Aydın", contactId: "person-202", summary: "Angebot Modernisierung PM3 (480.000 €) an Herrn Hesse geschickt. Rückfrage zu Lieferzeit Planetengetriebe." },
  { id: "act-4", organizationId: "org-200", date: "2026-08-21", type: "note", by: "Markus Feldmann", contactId: null, summary: "SLA im August zweimal knapp eingehalten (3:40 h, 3:55 h). Rufbereitschaft für PM3 um einen Techniker verstärken." },
  { id: "act-5", organizationId: "org-100", date: "2026-10-22", type: "meeting", by: "Tobias Lindner", contactId: "person-100", summary: "Herbstwartung Pumpwerk Nord abgeschlossen. Herr Ahlers fragt nach Ausweitung des BRK Monitor auf das Wasserwerk." },
  { id: "act-6", organizationId: "org-100", date: "2026-09-12", type: "email", by: "Tobias Lindner", contactId: "person-101", summary: "Frau Kröger bestätigt Budget 2027 für Wartung unverändert. Keine Kündigung geplant." },
  { id: "act-7", organizationId: "org-300", date: "2026-10-20", type: "email", by: "Selin Aydın", contactId: "person-300", summary: "Frau Wiesner bittet um Angebot für die Verlängerung des Wartungsvertrags und fragt, ob die Siloaustragung aufgenommen werden kann." },
  { id: "act-8", organizationId: "org-300", date: "2026-09-02", type: "meeting", by: "Selin Aydın", contactId: "person-301", summary: "Begehung Siloanlage: zusätzliche Förderschnecke ab Frühjahr geplant. Bedarf an zwei Getriebemotoren." },
  { id: "act-9", organizationId: "org-400", date: "2026-10-09", type: "meeting", by: "Tobias Lindner", contactId: "person-400", summary: "Workshop Retrofit Containerbrücke 4: Ziel 20 % weniger Energie im Hubwerk. Messdaten folgen bis Mitte November." },
  { id: "act-10", organizationId: "org-400", date: "2026-08-28", type: "call", by: "Tobias Lindner", contactId: "person-401", summary: "Frau Lüders kündigt an, den Rahmenvertrag 2027 neu auszuschreiben. Wir sollten vor Jahresende ein Verlängerungsangebot vorlegen." },
  { id: "act-11", organizationId: "org-500", date: "2026-10-16", type: "note", by: "Tobias Lindner", contactId: null, summary: "Vergabeunterlagen Schützantriebe heruntergeladen. Angebotsfrist am [[2026-11-13]], Bieterfragen bis [[2026-11-04]]." },
  { id: "act-12", organizationId: "org-500", date: "2026-09-24", type: "meeting", by: "Tobias Lindner", contactId: "person-500", summary: "Ortstermin an der Vorsperre mit Frau Lamprecht. Drei Antriebe korrodiert, Notbetrieb über Handrad." },
  { id: "act-13", organizationId: "org-600", date: "2026-10-23", type: "call", by: "Selin Aydın", contactId: "person-600", summary: "Halbzeitgespräch Pilot: Herr Kollmann ist überzeugt, will aber Preis für 20 Messstellen und ein Spaneraggregat-Angebot sehen." },
  { id: "act-14", organizationId: "org-600", date: "2026-08-12", type: "note", by: "Markus Feldmann", contactId: null, summary: "BRK Monitor meldet Lagerschaden an Spaner 2, Austausch im geplanten Stillstand. Ausfall vermieden." },
  { id: "act-15", organizationId: "org-700", date: "2026-10-05", type: "meeting", by: "Selin Aydın", contactId: "person-700", summary: "Erstgespräch auf der Messe. Neues Sudhaus mit sechs Rührwerken ab Sommer 2027. Wünscht Referenzbesuch." },
  { id: "act-16", organizationId: "org-800", date: "2026-06-18", type: "call", by: "Tobias Lindner", contactId: "person-800", summary: "Herr Stamm: mit neuem Dienstleister unzufrieden bei Reaktionszeiten, Vertrag dort läuft bis Ende 2027. Wiedervorlage Frühjahr 2027." },
  { id: "act-17", organizationId: "org-800", date: "2025-09-15", type: "email", by: "Tobias Lindner", contactId: "person-800", summary: "Kündigung des Servicevertrags zum 31.12.2025 eingegangen. Grund laut Kunde: Preis 18 % über Wettbewerb." },
  { id: "act-18", organizationId: "org-900", date: "2026-10-26", type: "call", by: "Markus Feldmann", contactId: "person-900", summary: "Frau Oswald meldet Geräusche an Rührwerk 3, Becken 2. Einsatz am Donnerstag zugesagt (SVC-1045)." },
  { id: "act-19", organizationId: "org-1000", date: "2026-10-19", type: "meeting", by: "Selin Aydın", contactId: "person-1000", summary: "Zweite Verhandlungsrunde: Einigung auf Konsignationslager. Offen: Haftungsgrenze (Kunde will 500.000 €) und Preisgleitung max. 3 %." },
  { id: "act-20", organizationId: "org-1000", date: "2026-09-08", type: "email", by: "Selin Aydın", contactId: "person-1000", summary: "Vertragsentwurf V-2026-011 an Frau Brenner geschickt." },
  { id: "act-21", organizationId: "org-1100", date: "2026-10-21", type: "meeting", by: "Tobias Lindner", contactId: "person-1100", summary: "Kick-off Zweitschredder: Konstruktion freigegeben, Liefertermin [[2027-02-15]] bestätigt. Herr Kessling fragt nach Servicevertrag für V3." },
  { id: "act-22", organizationId: "org-1100", date: "2026-09-24", type: "email", by: "Tobias Lindner", contactId: "person-1100", summary: "Auftrag Zweitschredder-Antrieb über 186.000 € unterschrieben zurück." },
  { id: "act-23", organizationId: "org-1200", date: "2026-10-12", type: "call", by: "Selin Aydın", contactId: "person-1200", summary: "Herr Ortner braucht die Revision der Sesselbahn bis [[2026-12-01]]. Angebot mit Festtermin gewünscht." },
];

export const DEALS = [
  { id: "deal-201", organizationId: "org-200", title: "Modernisierung Rollenantrieb PM3", stage: "verhandlung", value: 480000, closeDate: "2026-12-15", owner: "Selin Aydın", contactId: "person-200", nextStep: "Finanzierungsangebot mit Leasingpartner bis [[2026-11-06]]", lastActivity: "2026-10-14", source: "Bestandskunde" },
  { id: "deal-301", organizationId: "org-300", title: "Erweiterung Siloaustragung und Vertragsverlängerung", stage: "angebot", value: 38500, closeDate: "2026-11-27", owner: "Selin Aydın", contactId: "person-300", nextStep: "Verlängerungsangebot inkl. Siloaustragung vor Kündigungsfrist senden", lastActivity: "2026-10-20", source: "Bestandskunde" },
  { id: "deal-401", organizationId: "org-400", title: "Retrofit Hubwerk Containerbrücke 4", stage: "bedarfsanalyse", value: 265000, closeDate: "2027-02-26", owner: "Tobias Lindner", contactId: "person-400", nextStep: "Messdaten auswerten, Energiebilanz vorlegen", lastActivity: "2026-10-09", source: "Bestandskunde" },
  { id: "deal-402", organizationId: "org-400", title: "Verlängerung Rahmenvertrag Kranantriebe 2027–2029", stage: "qualifizierung", value: 630000, closeDate: "2027-01-29", owner: "Tobias Lindner", contactId: "person-401", nextStep: "Verlängerungsangebot vor Neuausschreibung platzieren", lastActivity: "2026-08-28", source: "Bestandskunde" },
  { id: "deal-501", organizationId: "org-500", title: "Ausschreibung Schützantriebe Talsperren", stage: "angebot", value: 340000, closeDate: "2026-12-18", owner: "Tobias Lindner", contactId: "person-500", nextStep: "Bieterfragen bis [[2026-11-04]], Angebot bis [[2026-11-13]]", lastActivity: "2026-10-16", source: "Ausschreibung" },
  { id: "deal-601", organizationId: "org-600", title: "BRK Monitor Rollout 20 Messstellen", stage: "verhandlung", value: 13200, closeDate: "2026-11-30", owner: "Selin Aydın", contactId: "person-600", nextStep: "Angebot vor Ablauf der Übernahmeoption am [[2026-11-30]]", lastActivity: "2026-10-23", source: "Pilot" },
  { id: "deal-602", organizationId: "org-600", title: "Neues Spaneraggregat Linie 2", stage: "qualifizierung", value: 95000, closeDate: "2027-04-30", owner: "Selin Aydın", contactId: "person-600", nextStep: "Technische Daten der Linie 2 anfragen", lastActivity: "2026-10-23", source: "Pilot" },
  { id: "deal-701", organizationId: "org-700", title: "Rührwerksantriebe Sudhaus", stage: "qualifizierung", value: 72000, closeDate: "2027-05-28", owner: "Selin Aydın", contactId: "person-700", nextStep: "Referenzbesuch bei Kornfeld Mühlenbetriebe organisieren", lastActivity: "2026-10-05", source: "Messe" },
  { id: "deal-801", organizationId: "org-800", title: "Rückgewinnung Service Zementlinie 2", stage: "verloren", value: 58000, closeDate: "2025-11-28", owner: "Tobias Lindner", contactId: "person-800", nextStep: "Wiedervorlage Frühjahr 2027", lastActivity: "2026-06-18", source: "Bestandskunde", lostReason: "Preis" },
  { id: "deal-1001", organizationId: "org-1000", title: "Ersatzteil-Rahmenvertrag mit Konsignationslager", stage: "verhandlung", value: 120000, closeDate: "2026-12-11", owner: "Selin Aydın", contactId: "person-1000", nextStep: "Haftungsgrenze mit Recht abstimmen (Gegenvorschlag 250.000 €)", lastActivity: "2026-10-19", source: "Empfehlung" },
  { id: "deal-1101", organizationId: "org-1100", title: "Antrieb Zweitschredder V3", stage: "gewonnen", value: 186000, closeDate: "2026-09-24", owner: "Tobias Lindner", contactId: "person-1100", nextStep: "Servicevertrag für V3 anbieten", lastActivity: "2026-10-21", source: "Bestandskunde" },
  { id: "deal-1102", organizationId: "org-1100", title: "Servicevertrag Vorzerkleinerer V3", stage: "bedarfsanalyse", value: 24000, closeDate: "2027-01-29", owner: "Tobias Lindner", contactId: "person-1100", nextStep: "Leistungsumfang analog V1/V2 vorschlagen", lastActivity: "2026-10-21", source: "Bestandskunde" },
  { id: "deal-1201", organizationId: "org-1200", title: "Revision Antrieb Sesselbahn Gipfelexpress", stage: "angebot", value: 64000, closeDate: "2026-11-06", owner: "Selin Aydın", contactId: "person-1200", nextStep: "Angebot mit Festtermin bis Freitag nachfassen", lastActivity: "2026-10-12", source: "Kaltakquise" },
  { id: "deal-102", organizationId: "org-100", title: "BRK Monitor Wasserwerk Lohmbach", stage: "bedarfsanalyse", value: 21600, closeDate: "2027-01-15", owner: "Tobias Lindner", contactId: "person-100", nextStep: "Messstellen im Wasserwerk aufnehmen", lastActivity: "2026-10-22", source: "Bestandskunde" },
];
