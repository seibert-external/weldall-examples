# Datenschutzhinweis und Löschfrist der Weldall-Demo

Stand: Oktober 2026. Angaben in [eckigen Klammern] sind noch offen und vor der Veröffentlichung zu klären.

## Worum es geht

Die Demo zeigt Weldall mit den Systemen einer erfundenen Firma (Brakenstedt Antriebstechnik GmbH). Alle Firmen, Personen, Verträge, Tickets, Wiki-Seiten und E-Mails darin sind erfunden; Ähnlichkeiten mit echten Firmen oder Personen sind nicht beabsichtigt. Die Demo ist nur lesend und ruft keine Sprachmodelle auf. Was Sie im Chat schreiben, bleibt in Ihrem Client und bei dem Modellanbieter, den Ihr Client nutzt; die Demo erhält nur die Abfragen, die der Agent an ihre Schnittstellen schickt.

Verantwortlich: [Name und Anschrift des Verantwortlichen]. Kontakt Datenschutz: [E-Mail-Adresse].

## Was die Demo über Sie speichert

Die Anmeldung läuft über Ihr Konto bei [Anmeldeanbieter: Seibert-Account unter customer.seibert.group; Anbieter und Datenschutzerklärung verlinken]. Nach der Anmeldung speichert der Weldall-Server der Demo in seiner Datenbank:

| Daten | Zweck |
|---|---|
| Name, E-Mail-Adresse, Bestätigungsstatus der E-Mail, Profilbild-Adresse (falls vom Anbieter geliefert), Zeitpunkt der ersten und letzten Änderung | Benutzerkonto |
| Kennung beim Anmeldeanbieter (Issuer, Subject) | Zuordnung der Anmeldung |
| Sitzungen mit Ablaufzeit, IP-Adresse und Browser-Kennung (User-Agent) | Angemeldet bleiben |
| [Ob Tokens des Anmeldeanbieters gespeichert werden; das Datenbankschema sieht Felder dafür vor] | – |
| Audit-Ereignisse: Zeitpunkt, Art (z. B. Anmeldung, Token-Ausgabe für eine Schnittstelle), Ihre Benutzer-ID und E-Mail-Adresse, Client-Kennung, Ergebnis, technische Zusatzangaben | Nachvollziehbarkeit und Missbrauchserkennung |
| Abrufe von Skills: welcher Skill, Ihre Benutzer-ID und Ihr Name, Zeitpunkt | Nutzungsstatistik der Skills |

Die Demo-Schnittstellen (Verträge, CRM, Tickets, Wiki, Postfach) speichern keine Abfragen und schreiben keine Zugriffsprotokolle. Kurzlebig gespeichert werden:

- ein Hashwert jedes Sicherheitsnachweises (DPoP-Proof) bis zu dessen Ablauf, gegen Wiederverwendung (Minuten);
- beim Prüfen der Gruppenzugehörigkeit Ihre E-Mail-Adresse für 5 Minuten, unter einem Hashwert der Adresse.

Jede bestätigte Identität erhält Lesezugriff auf die Demo-Daten (Gruppe `demo-readers`), nie Verwaltungsrechte.

Zusätzlich: Server- und Proxy-Protokolle der Hosting-Plattform [Coolify/Traefik: ob Zugriffsprotokolle mit IP-Adressen geschrieben werden und wie lange sie liegen], Protokolle des Weldall-Servers auf Stufe INFO [ob sie E-Mail-Adressen enthalten]. Hosting: [Anbieter und Standort des Servers].

## Löschfrist

- Benutzerkonten, Sitzungen, Audit-Ereignisse und Skill-Abrufe: [Frist festlegen, z. B. 90 Tage nach der letzten Anmeldung; Weldall löscht diese Daten nicht von selbst, die Löschung erfolgt [manuell / per Datenbank-Reset] durch [Verantwortliche Rolle]].
- Sicherheitsnachweise und Gruppenabfrage: automatisch nach Ablauf (Minuten).
- Ein vollständiger Reset der Demo löscht alle gespeicherten Daten.

Sie können jederzeit Auskunft und Löschung Ihres Kontos verlangen: [Kontaktweg]. Ihre Rechte nach der DSGVO (Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch, Beschwerde bei einer Aufsichtsbehörde) bleiben unberührt. Rechtsgrundlage: [z. B. Art. 6 Abs. 1 lit. b oder f DSGVO].
