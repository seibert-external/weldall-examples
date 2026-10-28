// Ticket system of Brakenstedt Antriebstechnik GmbH (invented). SVC is customer
// service, IT is internal. customerId and contractId point into the CRM and the
// contract register. Timestamps are written as of 28 October 2026 and move by
// whole days with the calendar.

export type Event =
  | { at: string; author: string; kind: "created" }
  | { at: string; author: string; kind: "comment"; text: string; internal?: boolean }
  | { at: string; author: string; kind: "status"; from: string; to: string }
  | { at: string; author: string; kind: "assign"; to: string };

export type Ticket = {
  key: string;
  type: "Störung" | "Serviceanfrage" | "Wartung" | "Reklamation" | "IT-Anfrage";
  summary: string;
  status: "Offen" | "In Arbeit" | "Wartet auf Kunde" | "Geplant" | "Erledigt";
  priority: "Kritisch" | "Hoch" | "Mittel" | "Niedrig";
  assignee: string | null;
  reporter: string;
  customerId: string | null;
  customer: string | null;
  contractId: string | null;
  asset: string | null;
  created: string;
  updated: string;
  sla: { respondBy: string; respondedAt: string | null; resolveBy: string | null } | null;
  visit: { at: string; technician: string } | null;
  labels: string[];
  description: string;
  history: Event[];
};

export const TEAM = [
  { name: "Markus Feldmann", role: "Leiter Service" },
  { name: "Lea Brandt", role: "Service-Disposition" },
  { name: "Konstantin Weber", role: "Servicetechniker" },
  { name: "Mirela Kovač", role: "Servicetechnikerin" },
  { name: "Erik Thalmann", role: "IT" },
];

export const TICKETS: Ticket[] = [
  {
    key: "SVC-1042", type: "Störung", summary: "Hauptantrieb Trockenpartie PM3: Lagertemperatur steigt über 85 °C",
    status: "In Arbeit", priority: "Kritisch", assignee: "Konstantin Weber", reporter: "Ute Blum",
    customerId: "org-200", customer: "Papierfabrik Rehwinkel AG", contractId: "ctr-1003", asset: "PM3 · Hauptantrieb BK-710 · Seriennr. 21-4471",
    created: "2026-10-27T15:10:00+01:00", updated: "2026-10-28T08:05:00+01:00",
    sla: { respondBy: "2026-10-27T19:10:00+01:00", respondedAt: "2026-10-27T15:52:00+01:00", resolveBy: "2026-10-28T15:10:00+01:00" },
    visit: { at: "2026-10-28T07:00:00+01:00", technician: "Konstantin Weber" },
    labels: ["PM3", "Rufbereitschaft", "Lager"],
    description: "Seit gestern Mittag steigt die Temperatur am antriebsseitigen Lager des Hauptantriebs der Trockenpartie von 68 °C auf aktuell 87 °C. Schwingungswerte leicht erhöht. Die Maschine läuft mit reduzierter Geschwindigkeit (–15 %). Ein Stillstand kostet laut Kunde rund 18.000 € pro Stunde.",
    history: [
      { at: "2026-10-27T15:10:00+01:00", author: "Ute Blum", kind: "created" },
      { at: "2026-10-27T15:52:00+01:00", author: "Lea Brandt", kind: "assign", to: "Konstantin Weber" },
      { at: "2026-10-27T15:53:00+01:00", author: "Lea Brandt", kind: "comment", text: "Rückruf bei Frau Blum: Geschwindigkeit reduziert, Temperatur wird stündlich protokolliert. Einsatz morgen 7:00 Uhr bestätigt." },
      { at: "2026-10-27T21:30:00+01:00", author: "Ute Blum", kind: "comment", text: "Temperatur jetzt 84 °C, steigt langsamer. Wir halten die Drehzahl." },
      { at: "2026-10-28T07:20:00+01:00", author: "Konstantin Weber", kind: "status", from: "Offen", to: "In Arbeit" },
      { at: "2026-10-28T08:05:00+01:00", author: "Konstantin Weber", kind: "comment", text: "Vor Ort. Ölprobe genommen, Schmierstoff deutlich dunkel, Partikel sichtbar. Verdacht auf beginnenden Lagerschaden. Ersatzlager liegt im Konsignationslager, Tausch im Stillstand ca. 6 Stunden. Abstimmung mit Frau Blum zum Stillstandsfenster läuft.", internal: false },
      { at: "2026-10-28T08:12:00+01:00", author: "Markus Feldmann", kind: "comment", text: "Wiederherstellungs-SLA endet heute 15:10 Uhr. Wenn der Kunde den Stillstand erst nachts freigibt, bitte schriftlich bestätigen lassen, damit die Fristverschiebung dokumentiert ist.", internal: true },
    ],
  },
  {
    key: "SVC-1047", type: "Wartung", summary: "Jahresrevision Walzenstühle in der Betriebsruhe planen",
    status: "Geplant", priority: "Mittel", assignee: "Mirela Kovač", reporter: "Lea Brandt",
    customerId: "org-300", customer: "Kornfeld Mühlenbetriebe KG", contractId: "ctr-1005", asset: "Walzenstühle WS1–WS6",
    created: "2026-10-12T10:15:00+02:00", updated: "2026-10-21T14:40:00+02:00",
    sla: null, visit: null,
    labels: ["Revision", "H1-Schmierstoff"],
    description: "Revision gemäß Wartungsvertrag in der Betriebsruhe zwischen den Jahren. Zwei Techniker, drei Tage. Achtung: Der Wartungsvertrag endet vor der Revision; sie ist nur bei Verlängerung abgedeckt.",
    history: [
      { at: "2026-10-12T10:15:00+02:00", author: "Lea Brandt", kind: "created" },
      { at: "2026-10-12T10:16:00+02:00", author: "Lea Brandt", kind: "assign", to: "Mirela Kovač" },
      { at: "2026-10-21T14:40:00+02:00", author: "Lea Brandt", kind: "status", from: "Offen", to: "Geplant" },
      { at: "2026-10-21T14:41:00+02:00", author: "Lea Brandt", kind: "comment", text: "Termin in der Betriebsruhe zwischen den Jahren mit Herrn Kornfeld abgestimmt. Vertragsverlängerung bei Selin Aydın angefragt.", internal: true },
    ],
  },
  {
    key: "SVC-1045", type: "Störung", summary: "Klärwerk Becken 2: Rührwerk 3 mit lautem Laufgeräusch",
    status: "Geplant", priority: "Hoch", assignee: "Mirela Kovač", reporter: "Martina Oswald",
    customerId: "org-900", customer: "Zweckverband Klärwerk Mittlere Aue", contractId: "ctr-1010", asset: "Belebungsbecken 2 · Rührwerk RW3",
    created: "2026-10-26T09:20:00+01:00", updated: "2026-10-26T11:05:00+01:00",
    sla: { respondBy: "2026-10-26T21:20:00+01:00", respondedAt: "2026-10-26T10:02:00+01:00", resolveBy: "2026-10-29T09:20:00+01:00" },
    visit: { at: "2026-10-29T08:00:00+01:00", technician: "Mirela Kovač" },
    labels: ["Lager", "Geräusch"],
    description: "Seit dem Wochenende mahlendes Geräusch am Rührwerk 3. Anlage läuft, Betreiberin hat auf Reserve-Rührwerk umgeschaltet.",
    history: [
      { at: "2026-10-26T09:20:00+01:00", author: "Martina Oswald", kind: "created" },
      { at: "2026-10-26T10:02:00+01:00", author: "Markus Feldmann", kind: "comment", text: "Telefonat mit Frau Oswald. Einsatz Donnerstag 8 Uhr, Ersatzlager wird mitgenommen." },
      { at: "2026-10-26T11:05:00+01:00", author: "Lea Brandt", kind: "status", from: "Offen", to: "Geplant" },
    ],
  },
  {
    key: "SVC-1044", type: "Serviceanfrage", summary: "Austauschgetriebe aus dem Pool für Portalkran 7 anfordern",
    status: "In Arbeit", priority: "Hoch", assignee: "Konstantin Weber", reporter: "Katrin Lüders",
    customerId: "org-400", customer: "Hafenlogistik Nordmarsch GmbH", contractId: "ctr-1006", asset: "Portalkran 7 · Fahrwerk links",
    created: "2026-10-27T06:45:00+01:00", updated: "2026-10-28T07:30:00+01:00",
    sla: { respondBy: "2026-10-27T14:45:00+01:00", respondedAt: "2026-10-27T07:20:00+01:00", resolveBy: "2026-10-28T18:45:00+01:00" },
    visit: { at: "2026-10-28T13:00:00+01:00", technician: "Konstantin Weber" },
    labels: ["Pool", "Tausch"],
    description: "Fahrwerksgetriebe links verliert Öl, Kran nur eingeschränkt nutzbar. Tausch aus dem Pool gemäß Rahmenvertrag (36 Stunden).",
    history: [
      { at: "2026-10-27T06:45:00+01:00", author: "Katrin Lüders", kind: "created" },
      { at: "2026-10-27T07:20:00+01:00", author: "Lea Brandt", kind: "assign", to: "Konstantin Weber" },
      { at: "2026-10-27T07:21:00+01:00", author: "Lea Brandt", kind: "status", from: "Offen", to: "In Arbeit" },
      { at: "2026-10-27T16:00:00+01:00", author: "Lea Brandt", kind: "comment", text: "Poolgetriebe BS-420 kommissioniert, Spedition holt morgen 6 Uhr ab." },
      { at: "2026-10-28T07:30:00+01:00", author: "Lea Brandt", kind: "comment", text: "Getriebe unterwegs, Ankunft ca. 12:30 Uhr. Montage ab 13 Uhr." },
    ],
  },
  {
    key: "SVC-1041", type: "Störung", summary: "Vorzerkleinerer V2: Getriebe blockiert nach Fremdkörper",
    status: "Wartet auf Kunde", priority: "Hoch", assignee: "Mirela Kovač", reporter: "Svenja Rohde",
    customerId: "org-1100", customer: "Haselgrund Recycling GmbH", contractId: "ctr-1012", asset: "Vorzerkleinerer V2 · Planetengetriebe BP-640",
    created: "2026-10-23T13:05:00+02:00", updated: "2026-10-26T16:20:00+01:00",
    sla: { respondBy: "2026-10-23T21:05:00+02:00", respondedAt: "2026-10-23T14:10:00+02:00", resolveBy: "2026-10-25T13:05:00+02:00" },
    visit: null,
    labels: ["Fremdkörper", "Gewährleistung prüfen"],
    description: "Stahlteil im Aufgabegut hat V2 blockiert. Getriebe ausgebaut, Zahnflanken der zweiten Stufe beschädigt. Instandsetzung im Werk Kassel, Ersatzgetriebe aus dem Pool läuft seit dem Folgetag.",
    history: [
      { at: "2026-10-23T13:05:00+02:00", author: "Svenja Rohde", kind: "created" },
      { at: "2026-10-23T14:10:00+02:00", author: "Markus Feldmann", kind: "assign", to: "Mirela Kovač" },
      { at: "2026-10-24T11:30:00+02:00", author: "Mirela Kovač", kind: "comment", text: "Poolgetriebe eingebaut, V2 läuft wieder. Defektes Getriebe geht ins Werk." },
      { at: "2026-10-26T16:20:00+01:00", author: "Mirela Kovač", kind: "comment", text: "Befund: Schaden durch Fremdkörper, keine Gewährleistung. Kostenvoranschlag Instandsetzung 14.200 € an Frau Rohde geschickt, Freigabe ausstehend." },
      { at: "2026-10-26T16:21:00+01:00", author: "Mirela Kovač", kind: "status", from: "In Arbeit", to: "Wartet auf Kunde" },
    ],
  },
  {
    key: "SVC-1038", type: "Wartung", summary: "Herbstwartung Pumpwerk Süd",
    status: "Erledigt", priority: "Niedrig", assignee: "Konstantin Weber", reporter: "Lea Brandt",
    customerId: "org-100", customer: "Stadtwerke Lohmbach GmbH", contractId: "ctr-1001", asset: "Pumpwerk Süd · 6 Antriebe",
    created: "2026-10-01T08:00:00+02:00", updated: "2026-10-22T15:30:00+02:00",
    sla: null, visit: { at: "2026-10-20T07:30:00+02:00", technician: "Konstantin Weber" },
    labels: ["Wartung", "Ölanalyse"],
    description: "Planmäßige Herbstwartung mit Schwingungsmessung und Ölwechsel.",
    history: [
      { at: "2026-10-01T08:00:00+02:00", author: "Lea Brandt", kind: "created" },
      { at: "2026-10-20T16:10:00+02:00", author: "Konstantin Weber", kind: "comment", text: "Wartung abgeschlossen. Pumpe P4: Schwingung im Grenzbereich, Empfehlung Lagertausch bei der Frühjahrswartung." },
      { at: "2026-10-22T15:30:00+02:00", author: "Lea Brandt", kind: "status", from: "In Arbeit", to: "Erledigt" },
    ],
  },
  {
    key: "SVC-1027", type: "Reklamation", summary: "Reaktionszeit im August überschritten – Gutschrift gefordert",
    status: "Erledigt", priority: "Mittel", assignee: "Markus Feldmann", reporter: "Florian Hesse",
    customerId: "org-200", customer: "Papierfabrik Rehwinkel AG", contractId: "ctr-1003", asset: "PM3 · Leitwalzenantrieb",
    created: "2026-08-18T09:00:00+02:00", updated: "2026-09-02T11:00:00+02:00",
    sla: null, visit: null,
    labels: ["SLA", "Gutschrift"],
    description: "Der Kunde bemängelt eine Reaktionszeit von 4:25 h bei einer Nachtstörung und fordert die vertragliche Gutschrift.",
    history: [
      { at: "2026-08-18T09:00:00+02:00", author: "Florian Hesse", kind: "created" },
      { at: "2026-08-20T10:30:00+02:00", author: "Markus Feldmann", kind: "comment", text: "Protokoll geprüft: Meldung 22:05 Uhr, Rückruf 02:30 Uhr. Überschreitung bestätigt. Gutschrift 5 % der Monatspauschale (400 €) angewiesen." },
      { at: "2026-09-02T11:00:00+02:00", author: "Markus Feldmann", kind: "status", from: "In Arbeit", to: "Erledigt" },
    ],
  },
  {
    key: "SVC-1046", type: "Serviceanfrage", summary: "Angebot Sensoren für 12 weitere Messstellen",
    status: "Offen", priority: "Niedrig", assignee: null, reporter: "Bernd Kollmann",
    customerId: "org-600", customer: "Sägewerk Fichtelhain GmbH", contractId: "ctr-1008", asset: "Spaneraggregat Linie 1",
    created: "2026-10-24T10:40:00+02:00", updated: "2026-10-24T10:40:00+02:00",
    sla: null, visit: null, labels: ["BRK Monitor", "Vertrieb"],
    description: "Herr Kollmann bittet um technische Prüfung, ob die Sensoren an Linie 2 ohne neues Gateway angebunden werden können.",
    history: [{ at: "2026-10-24T10:40:00+02:00", author: "Bernd Kollmann", kind: "created" }],
  },
  {
    key: "SVC-1043", type: "Störung", summary: "Schützantrieb Vorsperre: Endschalter ohne Funktion",
    status: "Offen", priority: "Mittel", assignee: null, reporter: "Ingrid Lamprecht",
    customerId: "org-500", customer: "Talsperrenverband Grauenbach", contractId: null, asset: "Vorsperre · Grundablass GA2",
    created: "2026-10-27T11:15:00+01:00", updated: "2026-10-27T11:15:00+01:00",
    sla: null, visit: null, labels: ["Kein Vertrag", "Ausschreibung"],
    description: "Kein Wartungsvertrag. Anfrage nach Einsatz nach Aufwand. Achtung: laufende Ausschreibung, Gleichbehandlung beachten.",
    history: [
      { at: "2026-10-27T11:15:00+01:00", author: "Ingrid Lamprecht", kind: "created" },
      { at: "2026-10-27T12:00:00+01:00", author: "Markus Feldmann", kind: "comment", text: "Vor Zusage mit Vertrieb (Tobias Lindner) und Recht klären, ob ein Einsatz während der Ausschreibung zulässig ist.", internal: true },
    ],
  },
  {
    key: "SVC-1040", type: "Serviceanfrage", summary: "Schulung Instandhaltungsteam zum BRK Monitor",
    status: "Geplant", priority: "Niedrig", assignee: "Markus Feldmann", reporter: "Dirk Ahlers",
    customerId: "org-100", customer: "Stadtwerke Lohmbach GmbH", contractId: "ctr-1002", asset: null,
    created: "2026-10-15T13:00:00+02:00", updated: "2026-10-19T09:10:00+02:00",
    sla: null, visit: { at: "2026-11-12T09:00:00+01:00", technician: "Markus Feldmann" },
    labels: ["Schulung"], description: "Halbtägige Schulung für sechs Personen zu Alarmregeln und Trendanalyse.",
    history: [
      { at: "2026-10-15T13:00:00+02:00", author: "Dirk Ahlers", kind: "created" },
      { at: "2026-10-19T09:10:00+02:00", author: "Markus Feldmann", kind: "status", from: "Offen", to: "Geplant" },
    ],
  },
  {
    key: "SVC-1039", type: "Reklamation", summary: "Ölleckage nach Wartung an Becherwerk 2",
    status: "Erledigt", priority: "Hoch", assignee: "Mirela Kovač", reporter: "Ralf Kornfeld",
    customerId: "org-300", customer: "Kornfeld Mühlenbetriebe KG", contractId: "ctr-1005", asset: "Becherwerk BW2",
    created: "2026-10-06T07:30:00+02:00", updated: "2026-10-07T15:00:00+02:00",
    sla: null, visit: null, labels: ["Nacharbeit", "Hygiene"],
    description: "Nach der Herbstwartung tropft Öl an der Abtriebswelle. Lebensmittelbereich, sofortige Nacharbeit gefordert.",
    history: [
      { at: "2026-10-06T07:30:00+02:00", author: "Ralf Kornfeld", kind: "created" },
      { at: "2026-10-06T11:00:00+02:00", author: "Mirela Kovač", kind: "comment", text: "Wellendichtring beim Einbau beschädigt. Getauscht, Fläche gereinigt, H1-Schmierstoff nachgefüllt. Kostenlos als Nacharbeit." },
      { at: "2026-10-07T15:00:00+02:00", author: "Lea Brandt", kind: "status", from: "In Arbeit", to: "Erledigt" },
    ],
  },
  {
    key: "IT-312", type: "IT-Anfrage", summary: "ERP Belegwerk: Preiserhöhung 2027 und Kündigungsfrist prüfen",
    status: "Offen", priority: "Mittel", assignee: "Erik Thalmann", reporter: "Paul Reinholz",
    customerId: null, customer: null, contractId: "ctr-2001", asset: "ERP Belegwerk",
    created: "2026-10-05T09:30:00+02:00", updated: "2026-10-05T09:30:00+02:00",
    sla: null, visit: null, labels: ["Lizenz", "Einkauf"],
    description: "Belegwerk kündigt 4,5 % Preiserhöhung für 2027 an. Prüfen, ob die Ankündigung fristgerecht war und ob wir Benutzer reduzieren können (aktiv genutzt: 71 von 85).",
    history: [{ at: "2026-10-05T09:30:00+02:00", author: "Paul Reinholz", kind: "created" }],
  },
  {
    key: "IT-318", type: "IT-Anfrage", summary: "Tablets für Servicetechniker: Ticket-App offline nutzbar machen",
    status: "In Arbeit", priority: "Mittel", assignee: "Erik Thalmann", reporter: "Markus Feldmann",
    customerId: null, customer: null, contractId: null, asset: null,
    created: "2026-10-19T08:15:00+02:00", updated: "2026-10-26T17:00:00+01:00",
    sla: null, visit: null, labels: ["Außendienst"],
    description: "In Pumpwerken und Kellern gibt es oft kein Netz. Technikerinnen und Techniker sollen Tickets offline lesen und Berichte erfassen können.",
    history: [
      { at: "2026-10-19T08:15:00+02:00", author: "Markus Feldmann", kind: "created" },
      { at: "2026-10-26T17:00:00+01:00", author: "Erik Thalmann", kind: "comment", text: "Offline-Modus der App aktiviert, Test mit Konstantin Weber nächste Woche." },
    ],
  },
];
