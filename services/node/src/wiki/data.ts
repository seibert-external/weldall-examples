// Company wiki of Brakenstedt Antriebstechnik GmbH (invented). Page bodies are
// Markdown. Dates are written as of October 2026 and move with the calendar.

export const SPACES = [
  { key: "SVC", name: "Kundenservice", description: "Prozesse, SLA und Rufbereitschaft des Service." },
  { key: "VERTRIEB", name: "Vertrieb", description: "Preise, Rabatte und Vertragsverlängerungen." },
  { key: "RECHT", name: "Recht und Verträge", description: "Freigaben, Unterschriften, Ausschreibungen." },
  { key: "PRODUKT", name: "Produkte", description: "Steckbriefe und technische Daten." },
];

export const PAGES = [
  {
    id: "page-101", space: "SVC", title: "Eskalationsprozess bei Störungen", author: "Markus Feldmann", updated: "2026-09-18",
    labels: ["prozess", "sla", "eskalation"],
    body: `## Wann eskalieren?

| Priorität | Beispiel | Eskalation an | Spätestens |
|---|---|---|---|
| Kritisch | Anlage steht oder läuft mit Notbetrieb | Leiter Service (Markus Feldmann) und Key Account | sofort |
| Hoch | Anlage eingeschränkt, Ausfall droht | Disposition (Lea Brandt) | 1 Stunde vor SLA-Ende |
| Mittel | Störung ohne Produktionseinfluss | Disposition | nach SLA-Ende |

## Ablauf
1. Ticket im System anlegen oder übernehmen, Priorität mit dem Kunden abstimmen.
2. Rückruf an den Kunden innerhalb der Reaktionszeit und Eintrag im Ticket (zählt als Reaktion).
3. Droht die Wiederherstellungszeit zu reißen: Kunde **schriftlich** informieren und Stillstandsfenster bestätigen lassen. Eine vom Kunden verschobene Freigabe hemmt die SLA-Uhr nur mit schriftlicher Bestätigung.
4. Nach Abschluss: Ursache, Maßnahmen und Ersatzteile im Ticket dokumentieren.

## Gutschriften
Gutschriften nach Vertrag (z. B. 5 % der Monatspauschale bei Rehwinkel) bucht der Leiter Service, nicht der Außendienst.`,
  },
  {
    id: "page-102", space: "SVC", title: "SLA-Definitionen und Messung", author: "Markus Feldmann", updated: "2026-06-03",
    labels: ["sla", "definition"],
    body: `- **Reaktionszeit**: von der Meldung (Hotline oder Ticket) bis zum qualifizierten Rückruf durch eine Fachkraft. Eine automatische Eingangsbestätigung zählt nicht.
- **Wiederherstellungszeit**: bis die Anlage wieder im vereinbarten Betrieb läuft, auch provisorisch (z. B. Tausch aus dem Pool).
- Uhren laufen rund um die Uhr, wenn der Vertrag „24/7“ sagt, sonst nur an Werktagen 7–17 Uhr.

| Kunde | Reaktion | Wiederherstellung | Folge bei Verstoß |
|---|---|---|---|
| Papierfabrik Rehwinkel (PM3) | 4 h, 24/7 | 24 h | 5 % Monatspauschale je Verstoß, max. 25 % |
| Hafenlogistik Nordmarsch | 8 h, 7 Tage | 36 h (Pooltausch) | 1.500 € je Tag, max. 15.000 €/Jahr |
| Haselgrund Recycling | 8 h, Werktage | 48 h | 250 € je Verstoß |
| Klärwerk Mittlere Aue | 12 h, Werktage | 72 h | keine Strafe, Kündigungsrecht bei Wiederholung |`,
  },
  {
    id: "page-103", space: "SVC", title: "Rufbereitschaft: Regeln und Vergütung", author: "Lea Brandt", updated: "2026-10-01",
    labels: ["rufbereitschaft", "personal"],
    body: `Die Rufbereitschaft wechselt wöchentlich montags um 7 Uhr. Der aktuelle Plan hängt in der Disposition und im Kalender „Service-Rufbereitschaft“.

- Erreichbarkeit innerhalb von 15 Minuten, Fahrbereitschaft innerhalb von 30 Minuten.
- Für Rehwinkel PM3 ist seit September zusätzlich ein zweiter Techniker eingeplant (Entscheidung nach zwei knappen SLA-Fällen im August).
- Vergütung: Pauschale pro Woche plus Einsatzzeit mit Zuschlag nach Betriebsvereinbarung.`,
  },
  {
    id: "page-201", space: "VERTRIEB", title: "Preisliste Service 2027 (Entwurf)", author: "Jana Hartwig", updated: "2026-10-15",
    labels: ["preise", "2027", "entwurf"],
    body: `**Entwurf, Freigabe durch die Geschäftsführung Mitte November.**

| Leistung | 2026 | 2027 (Entwurf) |
|---|---|---|
| Servicetechniker, Werktag | 98 €/h | 102 €/h |
| Zuschlag Nacht und Wochenende | 50 % | 50 % |
| Rufbereitschaft 24/7 je Monat | 1.900 € | 2.000 € |
| BRK Monitor je Messstelle und Monat | 60 € | 62 € |
| Anfahrt pauschal bis 100 km | 120 € | 125 € |

Bestandsverträge mit Preisgleitklausel werden zum Vertragsjahr angepasst; Verträge ohne Klausel erst bei Verlängerung. Kunden mit Kündigungsfrist im Winter (Kornfeld, Rehwinkel) **vor** Ablauf der Frist mit neuem Angebot ansprechen.`,
  },
  {
    id: "page-202", space: "VERTRIEB", title: "Rabatte und Freigabegrenzen", author: "Jana Hartwig", updated: "2026-03-10",
    labels: ["rabatt", "freigabe"],
    body: `| Rabatt auf Listenpreis | Freigabe durch |
|---|---|
| bis 5 % | Key Account Manager |
| bis 10 % | Leitung Vertrieb (Jana Hartwig) |
| über 10 % oder Festpreis über 24 Monate | Geschäftsführung |

Mehrjahresverträge (≥ 3 Jahre) dürfen zusätzlich 3 % erhalten. Rabatte immer mit Gegenleistung (Laufzeit, Volumen, Referenz).`,
  },
  {
    id: "page-203", space: "VERTRIEB", title: "Vorgehen bei Vertragsverlängerungen", author: "Jana Hartwig", updated: "2026-05-22",
    labels: ["verlängerung", "prozess", "fristen"],
    body: `1. **120 Tage vor der Kündigungsfrist**: Key Account prüft Umsatz, Tickets und Reklamationen des letzten Jahres.
2. **90 Tage vorher**: Gespräch mit dem Kunden, Bedarf und Zufriedenheit; Angebot für Verlängerung oder Erweiterung.
3. **30 Tage vorher**: Angebot liegt beim Kunden. Bei Lieferantenverträgen entscheidet der Einkauf über Kündigung oder Verlängerung.
4. Läuft eine Frist ohne Entscheidung ab, Kunden **nicht** auf die automatische Verlängerung „festnageln“, sondern das Gespräch suchen.

Fristen stehen im Vertragsregister; die Agenten-Abfrage „Welche Verträge laufen bis Jahresende aus?“ zeigt sie mit Zeitachse.`,
  },
  {
    id: "page-301", space: "RECHT", title: "Vertragsfreigabe und Unterschriften", author: "Dr. Henrike Sommer", updated: "2026-02-14",
    labels: ["recht", "freigabe", "haftung"],
    body: `- Jeder Kunden- und Lieferantenvertrag über 25.000 € pro Jahr geht vor Unterschrift an Recht und Vertragsmanagement (Dr. Henrike Sommer).
- **Haftung**: Standard ist die Begrenzung auf die Jahresvergütung, höchstens 250.000 € je Schadensfall. Höhere Grenzen nur mit Zustimmung der Geschäftsführung und Prüfung der Versicherungsdeckung (Betriebshaftpflicht 5 Mio. €).
- **Vertragsstrafen** nur mit Obergrenze; Produktionsausfall immer ausschließen.
- Unterschrift: bis 100.000 € Gesamtwert zwei Prokuristen, darüber Geschäftsführung.`,
  },
  {
    id: "page-302", space: "RECHT", title: "Öffentliche Ausschreibungen", author: "Dr. Henrike Sommer", updated: "2026-07-07",
    labels: ["vergabe", "ausschreibung", "vob"],
    body: `Während eines laufenden Vergabeverfahrens gilt für alle Kontakte zum Auftraggeber:

- Fragen ausschließlich über die Vergabeplattform als **Bieterfrage**, nicht per Telefon oder E-Mail an Fachabteilungen.
- Serviceeinsätze beim Auftraggeber nur nach Rücksprache mit Recht, damit kein Anschein von Vorteilsgewährung entsteht. Einsätze nach Aufwand zu Listenpreisen sind in der Regel zulässig.
- Angebotsfristen sind Ausschlussfristen: Abgabe spätestens einen Werktag vorher.`,
  },
  {
    id: "page-401", space: "PRODUKT", title: "BRK Monitor – Steckbrief", author: "Markus Feldmann", updated: "2026-08-30",
    labels: ["produkt", "brk-monitor", "iot"],
    body: `Zustandsüberwachung für Getriebe und Motoren mit Funksensoren (Schwingung, Temperatur), Gateway und Webportal.

- Erkennt Lager- und Verzahnungsschäden typischerweise 2–6 Wochen vor dem Ausfall.
- Datenhaltung in einem Rechenzentrum in Frankfurt am Main, Auftragsverarbeitung nach Art. 28 DSGVO.
- Preis 2026: 60 € je Messstelle und Monat, Pilot mit bis zu 8 Messstellen 6 Monate kostenfrei.
- Referenzen: Stadtwerke Lohmbach (24 Messstellen), Pilot Sägewerk Fichtelhain (Lagerschaden an Spaner 2 im August rechtzeitig erkannt).`,
  },
  {
    id: "page-402", space: "PRODUKT", title: "Planetengetriebe BP-Baureihe", author: "Konstantin Weber", updated: "2026-04-11",
    labels: ["produkt", "getriebe", "technik"],
    body: `| Typ | Nennmoment | Übersetzung | Typischer Einsatz |
|---|---|---|---|
| BP-420 | 42 kNm | 20–160 | Fahrwerke, Förderer |
| BP-640 | 64 kNm | 25–200 | Vorzerkleinerer, Rührwerke |
| BP-900 | 90 kNm | 30–250 | Schredder, Mühlen |

Ölwechsel alle 10.000 Betriebsstunden oder nach Ölanalyse. Bei Fremdkörperschäden keine Gewährleistung; Befund mit Fotos dokumentieren.`,
  },
];
