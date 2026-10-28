// Contract register of Brakenstedt Antriebstechnik GmbH (invented company).
// Dates are written as of October 2026 and move with the calendar (shared/dates.ts);
// [[YYYY-MM-DD]] in clause text becomes a German date. customerId values are
// organisation IDs in the CRM; supplier contracts have none.

export type Clause = {
  id: string;
  number: string;
  heading: string;
  text: string;
  tags: string[];
  important?: boolean;
};

export type Contract = {
  id: string;
  number: string;
  title: string;
  kind: string;
  direction: "customer" | "supplier";
  customerId: string | null;
  counterparty: string;
  counterpartyContact: string | null;
  owner: string;
  status: "active" | "draft" | "expired";
  signedOn: string | null;
  startsOn: string;
  endsOn: string;
  notice: { months?: number; weeks?: number } | null;
  renewal: { automatic: boolean; months?: number };
  value: number;
  valueBasis: "jährlich" | "einmalig" | "Abrufvolumen";
  currency: "EUR";
  summary: string;
  related: { tickets: string[]; deals: string[] };
  /** Dates set by a clause other than the term, e.g. an option or an order deadline. */
  milestones: { date: string; label: string }[];
  clauses: Clause[];
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
  notice?.weeks ? `${notice.weeks} Wochen` : notice?.months === 1 ? "einem Monat" : `${notice?.months} Monaten`;

function term(c: Draft): string {
  const start = `Der Vertrag beginnt am [[${c.startsOn}]] und läuft bis zum [[${c.endsOn}]].`;
  if (!c.notice && !c.renewal.automatic)
    return `${start} Er endet mit Ablauf dieses Tages, ohne dass es einer Kündigung bedarf. Eine Fortsetzung bedarf einer neuen schriftlichen Vereinbarung.`;
  const notice = `Jede Partei kann den Vertrag mit einer Frist von ${period(c.notice)} zum Ende der Laufzeit schriftlich kündigen; maßgeblich ist der Zugang der Kündigung.`;
  const renewal = c.renewal.automatic
    ? `Wird nicht fristgerecht gekündigt, verlängert sich der Vertrag jeweils um ${c.renewal.months} Monate zu den dann geltenden Konditionen.`
    : "Eine stillschweigende Verlängerung ist ausgeschlossen; eine Fortsetzung bedarf einer schriftlichen Vereinbarung.";
  return `${start} ${notice} ${renewal} Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.`;
}

function build(c: Draft): Contract {
  const { scope, services, sla, price, liability, processing, extra = [], ...contract } = c;
  const clauses: Omit<Clause, "id" | "number">[] = [
    { heading: "Vertragsgegenstand", text: scope, tags: ["leistung"] },
    { heading: "Leistungsumfang", text: services, tags: ["leistung"] },
    ...(sla
      ? [{
          heading: "Reaktions- und Wiederherstellungszeiten",
          text: `Störungen meldet der Auftraggeber über die Service-Hotline oder das Ticketsystem. Die Reaktionszeit beträgt ${sla.reaction}, die Wiederherstellungszeit für Störungen der Priorität „kritisch“ ${sla.restore}. ${sla.credit}`,
          tags: ["sla", "haftung"],
          important: true,
        }]
      : []),
    ...extra,
    { heading: "Vergütung und Preisanpassung", text: price, tags: ["preis"], important: /anpass|erhöh|index/i.test(price) },
    { heading: "Laufzeit und Kündigung", text: term(c), tags: ["frist"], important: true },
    { heading: "Haftung", text: liability, tags: ["haftung"] },
    ...(processing
      ? [{
          heading: "Datenschutz",
          text: "Soweit der Auftragnehmer im Rahmen der Fernwartung oder Zustandsüberwachung personenbezogene Daten verarbeitet, geschieht dies ausschließlich auf Grundlage der als Anlage 3 beigefügten Vereinbarung zur Auftragsverarbeitung nach Art. 28 DSGVO. Die Verarbeitung erfolgt in Rechenzentren innerhalb der Europäischen Union.",
          tags: ["datenschutz"],
        }]
      : []),
    {
      heading: "Schlussbestimmungen",
      text: "Änderungen und Ergänzungen bedürfen der Textform. Es gilt deutsches Recht. Gerichtsstand ist Kassel, sofern der Auftraggeber Kaufmann ist. Sollte eine Bestimmung unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.",
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
  "Der Auftragnehmer haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vertragstypisch vorhersehbaren Schaden begrenzt, höchstens auf die Jahresvergütung. Die Haftung für entgangenen Gewinn und Produktionsausfall ist ausgeschlossen, soweit gesetzlich zulässig.";

export const contracts: Contract[] = [
  build({
    id: "ctr-1001", number: "V-2023-014", title: "Wartungsvertrag Pumpwerke Nord und Süd", kind: "Wartungsvertrag",
    direction: "customer", customerId: "org-100", counterparty: "Stadtwerke Lohmbach GmbH", counterpartyContact: "Dirk Ahlers",
    owner: "Tobias Lindner", status: "active", signedOn: "2023-11-20", startsOn: "2024-01-01", endsOn: "2026-12-31",
    notice: { months: 3 }, renewal: { automatic: true, months: 12 }, value: 38400, valueBasis: "jährlich",
    summary: "Planmäßige Wartung von 14 Pumpenantrieben in zwei Pumpwerken, inklusive Schwingungsanalyse und Ölservice.",
    related: { tickets: ["SVC-1038"], deals: [] },
    scope: "Gegenstand ist die vorbeugende Wartung und Instandhaltung der Pumpenantriebe der Pumpwerke Nord (8 Antriebe) und Süd (6 Antriebe) des Auftraggebers gemäß Anlagenliste in Anlage 1.",
    services: "Der Auftragnehmer führt zwei Wartungen pro Jahr durch, jeweils mit Sichtprüfung, Schwingungsmessung, Ölanalyse und Ölwechsel nach Herstellervorgabe. Verschleißteile bis 150 € je Einsatz sind in der Pauschale enthalten. Störungseinsätze außerhalb der Wartungstermine werden nach der jeweils gültigen Preisliste abgerechnet.",
    price: "Die Wartungspauschale beträgt 38.400 € netto pro Jahr, zahlbar quartalsweise im Voraus. Zum 1. Januar jedes Jahres kann der Auftragnehmer die Pauschale entsprechend der Entwicklung des Tariflohns der Metall- und Elektroindustrie Hessen anpassen, höchstens um 5 % pro Jahr.",
    liability: LIABILITY_STANDARD,
  }),
  build({
    id: "ctr-1002", number: "V-2025-003", title: "BRK Monitor Abonnement – 24 Messstellen", kind: "Abonnement",
    direction: "customer", customerId: "org-100", counterparty: "Stadtwerke Lohmbach GmbH", counterpartyContact: "Dirk Ahlers",
    owner: "Tobias Lindner", status: "active", signedOn: "2025-02-11", startsOn: "2025-03-01", endsOn: "2027-02-28",
    notice: { months: 2 }, renewal: { automatic: true, months: 12 }, value: 17280, valueBasis: "jährlich",
    summary: "Zustandsüberwachung mit 24 Funksensoren, Dashboard und Alarmierung per E-Mail und SMS.",
    related: { tickets: [], deals: [] },
    scope: "Der Auftragnehmer stellt dem Auftraggeber die Zustandsüberwachung „BRK Monitor“ für 24 Messstellen an den Pumpenantrieben zur Nutzung bereit.",
    services: "Enthalten sind Leihsensoren, Gateway, Datenübertragung, Webportal mit Trendanalyse sowie Alarmierung bei Grenzwertüberschreitung. Die Verfügbarkeit des Portals beträgt 99,5 % im Jahresmittel.",
    price: "Die Vergütung beträgt 60 € netto je Messstelle und Monat, abgerechnet jährlich im Voraus. Zusätzliche Messstellen können jederzeit zum selben Preis anteilig hinzugebucht werden.",
    liability: LIABILITY_STANDARD, processing: true,
  }),
  build({
    id: "ctr-1003", number: "V-2022-031", title: "Premium-Servicevertrag Papiermaschine PM3", kind: "Servicevertrag",
    direction: "customer", customerId: "org-200", counterparty: "Papierfabrik Rehwinkel AG", counterpartyContact: "Carsten Meißner",
    owner: "Selin Aydın", status: "active", signedOn: "2022-12-19", startsOn: "2023-02-01", endsOn: "2027-01-31",
    notice: { months: 2 }, renewal: { automatic: true, months: 24 }, value: 96000, valueBasis: "jährlich",
    summary: "Rundum-Service für die Haupt- und Hilfsantriebe der PM3 mit 4-Stunden-Reaktionszeit und Rufbereitschaft rund um die Uhr.",
    related: { tickets: ["SVC-1042", "SVC-1027"], deals: ["deal-201"] },
    scope: "Gegenstand ist der Service für die Antriebstechnik der Papiermaschine PM3 am Standort Rehwinkel, insbesondere den Hauptantrieb der Trockenpartie, die Leitwalzenantriebe und die Antriebe der Aufrollung.",
    services: "Der Auftragnehmer übernimmt Inspektion, Wartung und Instandsetzung, hält ein Konsignationslager mit kritischen Ersatzteilen vor Ort vor und stellt eine Rufbereitschaft an 365 Tagen im Jahr, rund um die Uhr. Vierteljährlich findet ein Servicegespräch mit Bericht statt.",
    sla: {
      reaction: "4 Stunden rund um die Uhr",
      restore: "24 Stunden",
      credit: "Überschreitet der Auftragnehmer die Reaktionszeit, schreibt er je Verstoß 5 % der Monatspauschale gut, insgesamt höchstens 25 % der Monatspauschale.",
    },
    price: "Die Servicepauschale beträgt 8.000 € netto pro Monat. Der Auftragnehmer kann die Pauschale einmal jährlich mit einer Ankündigungsfrist von drei Monaten an den Erzeugerpreisindex für gewerbliche Produkte (Destatis) anpassen.",
    liability: "Die Haftung des Auftragnehmers ist je Schadensfall auf 250.000 € und pro Vertragsjahr auf 500.000 € begrenzt, ausgenommen Vorsatz, grobe Fahrlässigkeit und Personenschäden. Die Haftung für Produktionsausfall ist ausgeschlossen.",
    processing: true,
  }),
  build({
    id: "ctr-1004", number: "V-2024-022", title: "Rahmenvertrag Ersatzteile 2024–2027", kind: "Rahmenvertrag",
    direction: "customer", customerId: "org-200", counterparty: "Papierfabrik Rehwinkel AG", counterpartyContact: "Florian Hesse",
    owner: "Selin Aydın", status: "active", signedOn: "2024-06-12", startsOn: "2024-07-01", endsOn: "2027-06-30",
    notice: { months: 3 }, renewal: { automatic: false }, value: 140000, valueBasis: "Abrufvolumen",
    summary: "Abrufvertrag für Getriebeersatzteile mit Festpreisen und garantierten Lieferzeiten.",
    related: { tickets: [], deals: [] },
    scope: "Der Vertrag regelt die Lieferung von Ersatz- und Verschleißteilen für Getriebe und Antriebe der Baureihen BK und BS gemäß Teileliste in Anlage 1.",
    services: "Lagerhaltige Teile werden innerhalb von 48 Stunden, nicht lagerhaltige innerhalb von vier Wochen nach Abruf geliefert. Das geplante Abrufvolumen beträgt 140.000 € über die gesamte Laufzeit; eine Abnahmepflicht besteht nicht.",
    price: "Es gelten die Festpreise der Anlage 1 bis zum [[2025-06-30]]. Danach werden die Preise jährlich zum 1. Juli an den Erzeugerpreisindex für Getriebe und Antriebselemente angepasst; Erhöhungen über 6 % berechtigen den Auftraggeber zur Sonderkündigung.",
    liability: LIABILITY_STANDARD,
  }),
  build({
    id: "ctr-1005", number: "V-2021-008", title: "Wartungsvertrag Mahl- und Förderanlage", kind: "Wartungsvertrag",
    direction: "customer", customerId: "org-300", counterparty: "Kornfeld Mühlenbetriebe KG", counterpartyContact: "Anja Wiesner",
    owner: "Selin Aydın", status: "active", signedOn: "2021-11-03", startsOn: "2021-12-01", endsOn: "2026-11-30",
    notice: { months: 1 }, renewal: { automatic: true, months: 12 }, value: 21600, valueBasis: "jährlich",
    summary: "Wartung der Walzenstuhl- und Becherwerksantriebe einschließlich jährlicher Revision während des Betriebsstillstands.",
    related: { tickets: ["SVC-1047"], deals: ["deal-301"] },
    scope: "Gegenstand ist die Wartung der Antriebe von sechs Walzenstühlen, zwei Becherwerken und der Siloaustragung im Werk Kornfeld.",
    services: "Zwei Wartungen pro Jahr sowie eine Revision in der Betriebsruhe zwischen den Jahren. Für Lebensmittelbetriebe gelten die Hygieneregeln des Auftraggebers; Schmierstoffe müssen H1-zertifiziert sein.",
    price: "Die Pauschale beträgt 1.800 € netto pro Monat. Eine Preisanpassung ist nur zum Verlängerungszeitpunkt und mit einer Ankündigung von mindestens sechs Wochen möglich.",
    liability: LIABILITY_STANDARD,
  }),
  build({
    id: "ctr-1006", number: "V-2023-040", title: "Rahmenvertrag Kranantriebe Containerterminal", kind: "Rahmenvertrag",
    direction: "customer", customerId: "org-400", counterparty: "Hafenlogistik Nordmarsch GmbH", counterpartyContact: "Henrik Paulsen",
    owner: "Tobias Lindner", status: "active", signedOn: "2024-03-14", startsOn: "2024-04-01", endsOn: "2027-03-31",
    notice: { months: 3 }, renewal: { automatic: false }, value: 210000, valueBasis: "jährlich",
    summary: "Instandhaltung, Ersatzteile und Austauschantriebe für sechs Containerbrücken und zwölf Portalkrane.",
    related: { tickets: ["SVC-1044"], deals: ["deal-401"] },
    scope: "Der Rahmenvertrag umfasst Instandhaltung, Ersatzteilversorgung und den Austausch von Hub-, Fahr- und Drehwerksantrieben an den Kranen des Containerterminals Nordmarsch.",
    services: "Ein Pool von vier Austauschgetrieben wird beim Auftragnehmer vorgehalten. Der Austausch erfolgt innerhalb von 36 Stunden nach Abruf, auch an Wochenenden.",
    sla: {
      reaction: "8 Stunden an sieben Tagen pro Woche",
      restore: "36 Stunden durch Tausch aus dem Pool",
      credit: "Bei Überschreitung der Austauschzeit zahlt der Auftragnehmer eine Vertragsstrafe von 1.500 € je angefangenem Tag, höchstens 15.000 € pro Jahr.",
    },
    price: "Instandhaltungsleistungen werden nach Aufwand zu den Stundensätzen der Anlage 2 abgerechnet; die Poolgebühr beträgt 4.500 € netto pro Monat. Stundensätze werden jährlich zum 1. April um die Tarifsteigerung angepasst.",
    liability: LIABILITY_STANDARD,
  }),
  build({
    id: "ctr-1007", number: "V-2026-019", title: "Rahmenvereinbarung Schützantriebe (Entwurf)", kind: "Rahmenvertrag",
    direction: "customer", customerId: "org-500", counterparty: "Talsperrenverband Grauenbach", counterpartyContact: "Ingrid Lamprecht",
    owner: "Tobias Lindner", status: "draft", signedOn: null, startsOn: "2027-01-01", endsOn: "2030-12-31",
    notice: { months: 6 }, renewal: { automatic: false }, value: 85000, valueBasis: "jährlich",
    summary: "Entwurf aus der laufenden Ausschreibung: Erneuerung und Wartung der Antriebe von 18 Schützen und Grundablässen.",
    related: { tickets: [], deals: ["deal-501"] },
    scope: "Gegenstand ist die Lieferung, Montage und Wartung von Stellantrieben für Wehr- und Grundablassschütze an drei Talsperren des Auftraggebers.",
    services: "Austausch von 18 Antrieben in drei Bauabschnitten bis Ende 2028, danach Wartung und Rufbereitschaft. Es gelten die VOB/B und die Technischen Vertragsbedingungen des Auftraggebers.",
    price: "Die Preise ergeben sich aus dem Leistungsverzeichnis des Angebots. Eine Preisgleitung ist nur für Stahl nach der Stoffpreisgleitklausel des Formblatts 225 vorgesehen.",
    liability: "Es gelten die gesetzlichen Regelungen sowie die VOB/B. Der Auftragnehmer weist eine Betriebshaftpflichtversicherung mit mindestens 5 Mio. € Deckung nach.",
  }),
  build({
    id: "ctr-1008", number: "V-2026-007", title: "Pilotvereinbarung BRK Monitor", kind: "Pilotvereinbarung",
    direction: "customer", customerId: "org-600", counterparty: "Sägewerk Fichtelhain GmbH", counterpartyContact: "Bernd Kollmann",
    owner: "Selin Aydın", status: "active", signedOn: "2026-06-02", startsOn: "2026-06-15", endsOn: "2026-12-15",
    notice: null, renewal: { automatic: false }, value: 0, valueBasis: "einmalig",
    summary: "Kostenfreier Pilot mit acht Sensoren am Spaneraggregat; Übernahme in ein Abonnement möglich.",
    related: { tickets: [], deals: ["deal-601"] },
    milestones: [{ date: "2026-11-30", label: "Übernahmeoption ausüben" }],
    scope: "Der Auftragnehmer stellt die Zustandsüberwachung „BRK Monitor“ für acht Messstellen am Spaneraggregat für die Dauer des Pilotbetriebs kostenfrei bereit.",
    services: "Installation und Abbau der Sensoren, Zugang zum Webportal, ein Auswertungsgespräch zur Halbzeit und ein Abschlussbericht.",
    extra: [{
      heading: "Übernahmeoption",
      text: "Der Auftraggeber kann bis zum [[2026-11-30]] erklären, den Pilot nahtlos in ein Abonnement zu 55 € je Messstelle und Monat zu überführen. Ohne Erklärung baut der Auftragnehmer die Sensoren nach Pilotende ab.",
      tags: ["frist", "preis"],
      important: true,
    }],
    price: "Der Pilot ist kostenfrei. Der Auftraggeber trägt lediglich die Kosten für Strom und Netzanbindung des Gateways.",
    liability: "Die Haftung ist während des Pilotbetriebs auf Vorsatz und grobe Fahrlässigkeit beschränkt; ausgenommen sind Personenschäden.",
    processing: true,
  }),
  build({
    id: "ctr-1009", number: "V-2020-012", title: "Servicevertrag Mahlwerk Zementlinie 2", kind: "Servicevertrag",
    direction: "customer", customerId: "org-800", counterparty: "Harzfeld Zement AG", counterpartyContact: "Gerd Stamm",
    owner: "Tobias Lindner", status: "expired", signedOn: "2020-11-30", startsOn: "2021-01-01", endsOn: "2025-12-31",
    notice: { months: 3 }, renewal: { automatic: true, months: 12 }, value: 58000, valueBasis: "jährlich",
    summary: "Vom Kunden fristgerecht zum Jahresende 2025 gekündigt; Service wurde an einen Wettbewerber vergeben.",
    related: { tickets: [], deals: ["deal-801"] },
    scope: "Service für den Hauptantrieb der Rohrmühle und die Antriebe der Klinkerförderung der Zementlinie 2.",
    services: "Wartung, Ölanalyse, Thermografie und Instandsetzung nach Aufwand; Kündigung des Auftraggebers ging am [[2025-09-15]] ein.",
    price: "Pauschale 4.833 € netto pro Monat zuzüglich Material nach Aufwand.",
    liability: LIABILITY_STANDARD,
  }),
  build({
    id: "ctr-1010", number: "V-2022-027", title: "Wartungsvertrag Rührwerke Belebungsbecken", kind: "Wartungsvertrag",
    direction: "customer", customerId: "org-900", counterparty: "Zweckverband Klärwerk Mittlere Aue", counterpartyContact: "Martina Oswald",
    owner: "Tobias Lindner", status: "active", signedOn: "2022-08-25", startsOn: "2022-10-01", endsOn: "2027-09-30",
    notice: { months: 6 }, renewal: { automatic: true, months: 12 }, value: 44500, valueBasis: "jährlich",
    summary: "Wartung von 16 Rührwerks- und Gebläseantrieben; öffentlicher Auftraggeber, Verlängerung nur nach Haushaltsfreigabe.",
    related: { tickets: ["SVC-1045"], deals: [] },
    scope: "Gegenstand ist die Wartung der Rührwerks- und Gebläseantriebe der Belebungsbecken 1 bis 4 der Kläranlage Mittlere Aue.",
    services: "Quartalsweise Inspektion, jährliche Getriebeölanalyse, Austausch von Dichtungen und Lagern nach Befund. Es gelten ergänzend die VOL/B.",
    sla: {
      reaction: "12 Stunden an Werktagen",
      restore: "72 Stunden",
      credit: "Eine Vertragsstrafe ist nicht vereinbart; wiederholte Überschreitungen berechtigen zur außerordentlichen Kündigung.",
    },
    price: "Die Vergütung beträgt 44.500 € netto pro Jahr. Eine Preisanpassung ist ausgeschlossen; Mehrkosten werden ausschließlich über Nachträge abgerechnet.",
    liability: LIABILITY_STANDARD, processing: true,
  }),
  build({
    id: "ctr-1011", number: "V-2026-011", title: "Ersatzteil-Rahmenvertrag (Entwurf)", kind: "Rahmenvertrag",
    direction: "customer", customerId: "org-1000", counterparty: "Feinguss Ostheide GmbH", counterpartyContact: "Julia Brenner",
    owner: "Selin Aydın", status: "draft", signedOn: null, startsOn: "2027-01-01", endsOn: "2028-12-31",
    notice: { months: 3 }, renewal: { automatic: true, months: 12 }, value: 60000, valueBasis: "jährlich",
    summary: "Verhandlungsstand: Konsignationslager für Gießerei-Antriebe, offen sind Preisgleitung und Haftungsgrenze.",
    related: { tickets: [], deals: ["deal-1001"] },
    scope: "Lieferung von Ersatzteilen und Austauschantrieben für die Formanlage und die Sandaufbereitung der Gießerei Ostheide.",
    services: "Konsignationslager beim Auftraggeber mit monatlicher Bestandsabrechnung, Lieferzeit für Nicht-Lagerteile drei Wochen.",
    price: "Entwurf: Festpreise für zwölf Monate, danach Anpassung nach Erzeugerpreisindex. Der Auftraggeber fordert eine Obergrenze von 3 % pro Jahr.",
    liability: "Entwurf: Haftungsgrenze 100.000 € je Schadensfall. Der Auftraggeber fordert 500.000 €.",
  }),
  build({
    id: "ctr-1012", number: "V-2024-005", title: "Servicevertrag Schredderantriebe mit 8h-SLA", kind: "Servicevertrag",
    direction: "customer", customerId: "org-1100", counterparty: "Haselgrund Recycling GmbH", counterpartyContact: "Michael Kessling",
    owner: "Tobias Lindner", status: "active", signedOn: "2024-02-08", startsOn: "2024-03-01", endsOn: "2027-02-28",
    notice: { months: 3 }, renewal: { automatic: true, months: 12 }, value: 52800, valueBasis: "jährlich",
    summary: "Service für zwei Vorzerkleinerer und die Siebtrommel, Ersatzgetriebe im Pool.",
    related: { tickets: ["SVC-1041"], deals: ["deal-1101"] },
    scope: "Gegenstand ist der Service für die Antriebe der Vorzerkleinerer V1 und V2 sowie der Siebtrommel im Recyclingzentrum Haselgrund.",
    services: "Monatliche Inspektion, Ölservice, Instandsetzung nach Aufwand und Bereitstellung eines Ersatzgetriebes im Pool.",
    sla: {
      reaction: "8 Stunden an Werktagen",
      restore: "48 Stunden",
      credit: "Je Überschreitung der Reaktionszeit schreibt der Auftragnehmer 250 € gut.",
    },
    price: "Die Pauschale beträgt 4.400 € netto pro Monat. Anpassung jährlich zum 1. März nach Tariflohnentwicklung, höchstens 4 %.",
    liability: LIABILITY_STANDARD,
  }),
  build({
    id: "ctr-1013", number: "V-2026-024", title: "Liefervertrag Antrieb Zweitschredder", kind: "Liefervertrag",
    direction: "customer", customerId: "org-1100", counterparty: "Haselgrund Recycling GmbH", counterpartyContact: "Michael Kessling",
    owner: "Tobias Lindner", status: "active", signedOn: "2026-09-24", startsOn: "2026-10-01", endsOn: "2027-03-31",
    notice: null, renewal: { automatic: false }, value: 186000, valueBasis: "einmalig",
    summary: "Lieferung und Inbetriebnahme eines Planetengetriebes mit Antriebsmotor für den neuen Vorzerkleinerer V3.",
    related: { tickets: [], deals: ["deal-1101"] },
    milestones: [{ date: "2027-02-15", label: "Liefertermin" }],
    scope: "Lieferung, Montage und Inbetriebnahme eines Planetengetriebes BP-900 mit 400-kW-Antriebsmotor und Frequenzumrichter für den Vorzerkleinerer V3.",
    services: "Konstruktion der Adaption, Lieferung frei Baustelle, Montageaufsicht, Inbetriebnahme und Einweisung von bis zu acht Personen.",
    extra: [
      {
        heading: "Termine und Abnahme",
        text: "Liefertermin ist der [[2027-02-15]]. Die Abnahme erfolgt nach einem störungsfreien Probebetrieb von 72 Stunden. Bei Lieferverzug zahlt der Auftragnehmer 0,2 % des Auftragswerts je Werktag, höchstens 5 %.",
        tags: ["frist", "abnahme", "haftung"],
        important: true,
      },
      {
        heading: "Zahlungsplan",
        text: "30 % bei Auftragsbestätigung, 60 % bei Lieferung, 10 % nach Abnahme. Gewährleistung 24 Monate ab Abnahme.",
        tags: ["preis"],
      },
    ],
    price: "Festpreis 186.000 € netto. Preisanpassungen sind ausgeschlossen.",
    liability: LIABILITY_STANDARD,
  }),
  build({
    id: "ctr-2001", number: "E-2022-004", title: "Softwarelizenz ERP „Belegwerk“", kind: "Software-Lizenzvertrag",
    direction: "supplier", customerId: null, counterparty: "Belegwerk Software GmbH", counterpartyContact: null,
    owner: "Erik Thalmann", status: "active", signedOn: "2022-11-28", startsOn: "2023-01-01", endsOn: "2026-12-31",
    notice: { months: 3 }, renewal: { automatic: true, months: 12 }, value: 28900, valueBasis: "jährlich",
    summary: "ERP-Lizenzen für 85 Benutzer inklusive Wartung; Preiserhöhung um 4,5 % für 2027 angekündigt.",
    related: { tickets: ["IT-312"], deals: [] },
    scope: "Nutzungsrecht an der ERP-Software „Belegwerk“ für 85 benannte Benutzer einschließlich Softwarepflege und Hotline.",
    services: "Updates und Sicherheitskorrekturen, Hotline werktags 8 bis 17 Uhr, Betrieb in der Cloud des Lizenzgebers mit 99,5 % Verfügbarkeit.",
    price: "Die Jahresgebühr beträgt 28.900 € netto. Der Lizenzgeber kann die Gebühr zum Verlängerungszeitpunkt mit einer Ankündigung von drei Monaten um bis zu 5 % erhöhen.",
    liability: "Die Haftung des Lizenzgebers ist auf die Jahresgebühr begrenzt, ausgenommen Vorsatz, grobe Fahrlässigkeit und Personenschäden.",
    processing: true,
  }),
  build({
    id: "ctr-2002", number: "E-2023-011", title: "Leasing Servicefahrzeuge (12 Transporter)", kind: "Leasingvertrag",
    direction: "supplier", customerId: null, counterparty: "Kurbelstein Flottenleasing GmbH", counterpartyContact: null,
    owner: "Markus Feldmann", status: "active", signedOn: "2023-01-10", startsOn: "2023-02-01", endsOn: "2027-01-31",
    notice: null, renewal: { automatic: false }, value: 64800, valueBasis: "jährlich",
    summary: "Kilometerleasing für 12 Servicetransporter; Anschlussfahrzeuge haben vier Monate Lieferzeit.",
    related: { tickets: [], deals: [] },
    milestones: [{ date: "2026-10-31", label: "Anschlussleasing bestellen" }],
    scope: "Leasing von zwölf Transportern mit Werkstatteinbau für den Außendienst, Laufleistung 35.000 km pro Fahrzeug und Jahr.",
    services: "Wartung, Reifen und Versicherung sind enthalten. Mehr- und Minderkilometer werden mit 8 Cent je Kilometer abgerechnet.",
    extra: [{
      heading: "Rückgabe und Anschlussleasing",
      text: "Die Fahrzeuge sind am Vertragsende am Standort Kassel zurückzugeben. Soll das Anschlussleasing nahtlos beginnen, muss die Bestellung bis zum [[2026-10-31]] beim Leasinggeber eingehen.",
      tags: ["frist"],
      important: true,
    }],
    price: "Die Leasingrate beträgt 450 € netto je Fahrzeug und Monat, fest für die Laufzeit.",
    liability: "Es gelten die Allgemeinen Leasingbedingungen des Leasinggebers in der Fassung vom [[2022-09-01]].",
  }),
  build({
    id: "ctr-2003", number: "E-2024-002", title: "Unterhaltsreinigung Werk Kassel", kind: "Dienstleistungsvertrag",
    direction: "supplier", customerId: null, counterparty: "Reinhaus Gebäudedienste GmbH", counterpartyContact: null,
    owner: "Paul Reinholz", status: "active", signedOn: "2024-11-18", startsOn: "2025-01-01", endsOn: "2026-12-31",
    notice: { weeks: 6 }, renewal: { automatic: true, months: 12 }, value: 31200, valueBasis: "jährlich",
    summary: "Unterhaltsreinigung von Büro, Sozialräumen und Werkstattflächen; Qualität zuletzt mehrfach bemängelt.",
    related: { tickets: [], deals: [] },
    scope: "Unterhaltsreinigung der Büro- und Sozialflächen (2.100 m²) sowie Grundreinigung der Werkstattböden im Werk Kassel.",
    services: "Büro und Sanitär werktäglich, Werkstattböden monatlich, Glasreinigung zweimal jährlich. Mängel sind innerhalb von 24 Stunden nachzubessern.",
    price: "Die monatliche Vergütung beträgt 2.600 € netto. Anpassungen bei Änderung des Mindestlohns in der Gebäudereinigung sind zulässig.",
    liability: "Der Auftragnehmer haftet für Schäden nach den gesetzlichen Bestimmungen und weist eine Haftpflichtversicherung über 3 Mio. € nach.",
  }),
  build({
    id: "ctr-2004", number: "E-2021-001", title: "Mietvertrag Lagerhalle Werk 2", kind: "Mietvertrag",
    direction: "supplier", customerId: null, counterparty: "Hallenvermietung Ostring GbR", counterpartyContact: null,
    owner: "Paul Reinholz", status: "active", signedOn: "2021-04-22", startsOn: "2021-07-01", endsOn: "2031-06-30",
    notice: { months: 12 }, renewal: { automatic: true, months: 60 }, value: 96000, valueBasis: "jährlich",
    summary: "Gewerbemietvertrag über 3.200 m² Lagerfläche mit Indexmiete.",
    related: { tickets: [], deals: [] },
    scope: "Vermietet werden die Lagerhalle Ostring 9 mit 3.200 m² Fläche, 40 Außenstellplätze und eine Kranbahn mit 10 t Traglast.",
    services: "Die Vermieterin trägt Instandhaltung von Dach und Fach; Schönheitsreparaturen und die Wartung der Kranbahn trägt die Mieterin.",
    price: "Die Nettokaltmiete beträgt 8.000 € pro Monat. Sie ändert sich jährlich im Verhältnis des Verbraucherpreisindex (Indexmiete nach § 557b BGB).",
    liability: "Es gelten die gesetzlichen Bestimmungen des Mietrechts.",
  }),
  build({
    id: "ctr-2005", number: "E-2024-009", title: "Stromliefervertrag 2025–2026", kind: "Energieliefervertrag",
    direction: "supplier", customerId: null, counterparty: "Fernstrom Ellertal GmbH", counterpartyContact: null,
    owner: "Paul Reinholz", status: "active", signedOn: "2024-10-07", startsOn: "2025-01-01", endsOn: "2026-12-31",
    notice: null, renewal: { automatic: false }, value: 182000, valueBasis: "jährlich",
    summary: "Festpreisvertrag für 1,1 GWh pro Jahr; ohne Anschlussvertrag fällt der Standort ab 2027 in die Ersatzversorgung.",
    related: { tickets: [], deals: [] },
    scope: "Belieferung des Werks Kassel und der Lagerhalle Werk 2 mit elektrischer Energie, geplante Menge 1,1 GWh pro Jahr.",
    services: "Vollversorgung mit 100 % Ökostrom aus Anlagen in der EU, Herkunftsnachweise jährlich.",
    price: "Festpreis 16,5 ct/kWh netto zuzüglich Netzentgelte, Umlagen und Stromsteuer. Mehr- oder Mindermengen über 10 % werden zum Börsenpreis abgerechnet.",
    liability: "Die Haftung für Versorgungsunterbrechungen richtet sich nach § 18 NAV.",
  }),
];
