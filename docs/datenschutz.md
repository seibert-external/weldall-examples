# Datenschutzhinweis und Löschfrist der Weldall-Demo

Stand: November 2026.

## Worum es geht

Die Demo zeigt Weldall mit den Systemen einer erfundenen Firma (Brakenstedt Antriebstechnik GmbH). Für Kundendemos gibt es zusätzlich eine erfundene Zahnarztpraxis, die nur freigeschaltete Konten sehen. Alle Firmen, Personen, Patienten, Termine, Verträge, Tickets, Wiki-Seiten und E-Mails darin sind erfunden; Ähnlichkeiten mit echten Firmen oder Personen sind nicht beabsichtigt. Die Demo ist nur lesend und ruft keine Sprachmodelle auf. Was Sie im Chat schreiben, bleibt in Ihrem Client und bei dem Modellanbieter, den Ihr Client nutzt; die Demo erhält nur die Abfragen, die der Agent an ihre Schnittstellen schickt.

Verantwortlich: Seibert Group GmbH, Luisenstraße 37-39, 65185 Wiesbaden. Kontakt Datenschutz: datenschutz@seibert.group, Datenschutzbeauftragter: dsb@seibert.group.

## Was die Demo über Sie speichert

Die Anmeldung läuft über Ihr Konto beim Seibert Customer Login (customer.seibert.group) der Seibert Group GmbH; dafür gelten die [Nutzungsbedingungen und Datenschutzhinweise des Kundenportals](https://go.seibert.group/recht/sg/kundenportal). Nach der Anmeldung speichert der Weldall-Server der Demo in seiner Datenbank:

| Daten | Zweck |
|---|---|
| Name, E-Mail-Adresse, Bestätigungsstatus der E-Mail, Profilbild-Adresse (falls vom Anbieter geliefert), Zeitpunkt der ersten und letzten Änderung | Benutzerkonto |
| Kennung beim Anmeldeanbieter (Issuer, Subject) | Zuordnung der Anmeldung |
| Sitzungen mit Ablaufzeit, IP-Adresse und Browser-Kennung (User-Agent) | Angemeldet bleiben |
| Audit-Ereignisse: Zeitpunkt, Art (z. B. Anmeldung, Token-Ausgabe für eine Schnittstelle), Ihre Benutzer-ID und E-Mail-Adresse, Client-Kennung, Ergebnis, technische Zusatzangaben | Nachvollziehbarkeit und Missbrauchserkennung |
| Abrufe von Skills: welcher Skill, Ihre Benutzer-ID und Ihr Name, Zeitpunkt | Nutzungsstatistik der Skills |

Tokens des Anmeldeanbieters speichert die Demo nicht.

Die Demo-Schnittstellen (Verträge, CRM, Tickets, Wiki, Postfach, Praxis) speichern keine Abfragen und schreiben keine Zugriffsprotokolle. Kurzlebig gespeichert werden:

- ein Hashwert jedes Sicherheitsnachweises (DPoP-Proof) bis zu dessen Ablauf, gegen Wiederverwendung (Minuten);
- beim Prüfen der Gruppenzugehörigkeit Ihre E-Mail-Adresse für 5 Minuten, unter einem Hashwert der Adresse.

Jede bestätigte Identität erhält Lesezugriff auf die Demo-Daten (Gruppe `demo-readers`), nie Verwaltungsrechte.

Bei jedem Aufruf wird Ihre IP-Adresse technisch bedingt verarbeitet. Für Betrieb und Sicherheit schreiben die Hosting-Plattform und der Weldall-Server Protokolle; der Weldall-Server maskiert darin E-Mail-Adressen. Die Demo läuft auf der von der Seibert Group verwalteten Hosting-Plattform, die Server stellt die Hetzner Online GmbH, Gunzenhausen. Verarbeitungsort: Deutschland (EU).

## Löschfrist

- Benutzerkonten, Sitzungen, Audit-Ereignisse und Skill-Abrufe: bis Sie die Löschung verlangen oder wir die Demo zurücksetzen. Weldall löscht diese Daten nicht von selbst.
- Protokolle: so lange, wie es für Betrieb und Sicherheit erforderlich ist.
- Sicherheitsnachweise und Gruppenabfrage: automatisch nach Ablauf (Minuten).
- Ein vollständiger Reset der Demo löscht alle gespeicherten Daten.

Sie können jederzeit Auskunft und Löschung Ihres Kontos verlangen: datenschutz@seibert.group. Ihre Rechte nach der DSGVO (Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch, Beschwerde bei einer Aufsichtsbehörde) bleiben unberührt. Rechtsgrundlagen: Art. 6 Abs. 1 lit. b DSGVO für Konto und Anmeldung, Art. 6 Abs. 1 lit. f DSGVO für Audit-Ereignisse, Skill-Abrufe und Protokolle; unser berechtigtes Interesse ist ein sicherer und stabiler Betrieb.
