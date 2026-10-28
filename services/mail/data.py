"""Shared sales mailbox of Brakenstedt Antriebstechnik GmbH (invented company).

customerId values are CRM organisation IDs; related IDs point into the contract
register, the ticket system and the CRM pipeline. Timestamps are written as of
28 October 2026 and move with the calendar (see dates.py).
"""

MAILBOX = {
    "address": "vertrieb@brakenstedt.example",
    "name": "Vertrieb Brakenstedt",
    "members": ["Jana Hartwig", "Tobias Lindner", "Selin Aydın"],
}

FOLDERS = ["Posteingang", "Gesendet"]


def _person(name, email):
    return {"name": name, "email": email}


SELIN = _person("Selin Aydın", "selin.aydin@brakenstedt.example")
TOBIAS = _person("Tobias Lindner", "tobias.lindner@brakenstedt.example")
JANA = _person("Jana Hartwig", "jana.hartwig@brakenstedt.example")
VERTRIEB = _person("Vertrieb Brakenstedt", "vertrieb@brakenstedt.example")

MESSAGES = [
    {
        "id": "msg-1018",
        "threadId": "thr-rehwinkel-pm3",
        "folder": "Posteingang",
        "from": _person("Carsten Meißner", "carsten.meissner@papierfabrik-rehwinkel.example"),
        "to": [VERTRIEB],
        "cc": [_person("Ute Blum", "ute.blum@papierfabrik-rehwinkel.example")],
        "subject": "PM3 – Lagerschaden und Ihr Angebot zur Modernisierung",
        "receivedAt": "2026-10-28T09:12:00+01:00",
        "read": False,
        "flagged": True,
        "customerId": "org-200",
        "related": {"tickets": ["SVC-1042"], "contracts": ["ctr-1003"], "deals": ["deal-201"]},
        "attachments": [],
        "body": (
            "Sehr geehrte Frau Aydın,\n\n"
            "Ihr Techniker ist seit heute früh an der PM3, danke für die schnelle Reaktion. "
            "Wenn sich der Lagerschaden bestätigt, ist das der dritte ungeplante Eingriff am "
            "Hauptantrieb in diesem Jahr.\n\n"
            "Das bestärkt uns, die Modernisierung des Rollenantriebs vorzuziehen. Bitte schicken "
            "Sie uns bis Ende nächster Woche das Angebot mit der Finanzierungsvariante, die wir "
            "im Quartalsgespräch besprochen haben. Unser Vorstand entscheidet im Dezember.\n\n"
            "Außerdem läuft unser Servicevertrag aus. Wir möchten ihn verlängern, aber über die "
            "Reaktionszeiten in der Nacht sprechen.\n\n"
            "Mit freundlichen Grüßen\nCarsten Meißner\nTechnischer Leiter, Papierfabrik Rehwinkel AG"
        ),
    },
    {
        "id": "msg-1017",
        "threadId": "thr-kornfeld-verlaengerung",
        "folder": "Posteingang",
        "from": _person("Anja Wiesner", "a.wiesner@kornfeld-muehle.example"),
        "to": [SELIN],
        "cc": [VERTRIEB],
        "subject": "AW: Verlängerung Wartungsvertrag – Frist diese Woche",
        "receivedAt": "2026-10-27T17:40:00+01:00",
        "read": False,
        "flagged": True,
        "customerId": "org-300",
        "related": {"tickets": ["SVC-1047"], "contracts": ["ctr-1005"], "deals": ["deal-301"]},
        "attachments": [],
        "body": (
            "Hallo Frau Aydın,\n\n"
            "wir haben Ihr Angebot noch nicht. Laut Vertrag müssten wir bis zum [[2026-10-31]] "
            "kündigen, sonst verlängert er sich um ein Jahr. Grundsätzlich wollen wir weitermachen, "
            "aber nur mit der Siloaustragung im Umfang und ohne größere Preiserhöhung.\n\n"
            "Wenn bis Freitag nichts da ist, muss ich vorsorglich kündigen.\n\n"
            "Viele Grüße\nAnja Wiesner\nGeschäftsführerin, Kornfeld Mühlenbetriebe KG"
        ),
    },
    {
        "id": "msg-1016",
        "threadId": "thr-haselgrund-v2",
        "folder": "Posteingang",
        "from": _person("Svenja Rohde", "svenja.rohde@haselgrund-recycling.example"),
        "to": [TOBIAS],
        "cc": [],
        "subject": "Kostenvoranschlag Getriebe V2 – Rückfrage",
        "receivedAt": "2026-10-27T11:05:00+01:00",
        "read": True,
        "flagged": False,
        "customerId": "org-1100",
        "related": {"tickets": ["SVC-1041"], "contracts": ["ctr-1012"], "deals": []},
        "attachments": [{"name": "KV-2026-1184.pdf", "size": 182340}],
        "body": (
            "Hallo Herr Lindner,\n\n"
            "14.200 € für die Instandsetzung sind mehr, als wir eingeplant hatten. Können Sie uns "
            "sagen, ob ein Austauschgetriebe dauerhaft günstiger wäre? Das Poolgetriebe läuft "
            "einwandfrei.\n\n"
            "Und: Herr Kessling möchte für den neuen V3 gleich einen Servicevertrag wie für V1 und V2.\n\n"
            "Gruß\nSvenja Rohde"
        ),
    },
    {
        "id": "msg-1015",
        "threadId": "thr-belegwerk-preis",
        "folder": "Posteingang",
        "from": _person("Belegwerk Kundenservice", "kundenservice@belegwerk.example"),
        "to": [_person("Paul Reinholz", "paul.reinholz@brakenstedt.example")],
        "cc": [VERTRIEB],
        "subject": "Preisanpassung Belegwerk zum [[2027-01-01]]",
        "receivedAt": "2026-10-26T08:00:00+01:00",
        "read": True,
        "flagged": False,
        "customerId": None,
        "related": {"tickets": ["IT-312"], "contracts": ["ctr-2001"], "deals": []},
        "attachments": [{"name": "Preisblatt-2027.pdf", "size": 96512}],
        "body": (
            "Sehr geehrte Damen und Herren,\n\n"
            "gemäß Ihrem Lizenzvertrag passen wir die Jahresgebühr zum [[2027-01-01]] um 4,5 % an. "
            "Ihre neue Jahresgebühr beträgt 30.200,50 € netto.\n\n"
            "Mit freundlichen Grüßen\nIhr Belegwerk-Team"
        ),
    },
    {
        "id": "msg-1014",
        "threadId": "thr-kargrat-revision",
        "folder": "Posteingang",
        "from": _person("Matthias Ortner", "m.ortner@bergbahnen-kargrat.example"),
        "to": [SELIN],
        "cc": [],
        "subject": "Revision Gipfelexpress – brauchen Zusage bis Freitag",
        "receivedAt": "2026-10-26T16:22:00+01:00",
        "read": True,
        "flagged": True,
        "customerId": "org-1200",
        "related": {"tickets": [], "contracts": [], "deals": ["deal-1201"]},
        "attachments": [],
        "body": (
            "Hallo Frau Aydın,\n\n"
            "Ihr Angebot passt preislich. Ich brauche aber eine verbindliche Zusage, dass die "
            "Revision bis [[2026-12-01]] abgeschlossen ist, sonst muss ich den anderen Anbieter "
            "nehmen. Saisonstart ist der 12. Dezember.\n\n"
            "Servus\nMatthias Ortner"
        ),
    },
    {
        "id": "msg-1013",
        "threadId": "thr-grauenbach-vergabe",
        "folder": "Posteingang",
        "from": _person("Vergabestelle Talsperrenverband", "vergabe@talsperren-grauenbach.example"),
        "to": [TOBIAS],
        "cc": [],
        "subject": "Vergabe SA-2026-14 Schützantriebe: Antworten auf Bieterfragen",
        "receivedAt": "2026-10-23T10:00:00+02:00",
        "read": True,
        "flagged": False,
        "customerId": "org-500",
        "related": {"tickets": ["SVC-1043"], "contracts": ["ctr-1007"], "deals": ["deal-501"]},
        "attachments": [{"name": "Bieterinformation-02.pdf", "size": 241001}],
        "body": (
            "Sehr geehrte Bieter,\n\n"
            "anbei die Antworten auf die bisher eingegangenen Bieterfragen. Die Angebotsfrist "
            "bleibt unverändert der [[2026-11-13]], 12:00 Uhr. Weitere Fragen sind bis [[2026-11-04]] "
            "ausschließlich über die Vergabeplattform zu stellen.\n\n"
            "Mit freundlichen Grüßen\nVergabestelle"
        ),
    },
    {
        "id": "msg-1012",
        "threadId": "thr-fichtelhain-pilot",
        "folder": "Posteingang",
        "from": _person("Bernd Kollmann", "b.kollmann@saegewerk-fichtelhain.example"),
        "to": [SELIN],
        "cc": [],
        "subject": "Pilot BRK Monitor – wie geht es weiter?",
        "receivedAt": "2026-10-24T09:48:00+02:00",
        "read": True,
        "flagged": False,
        "customerId": "org-600",
        "related": {
            "tickets": ["SVC-1046"],
            "contracts": ["ctr-1008"],
            "deals": ["deal-601", "deal-602"],
        },
        "attachments": [],
        "body": (
            "Hallo Frau Aydın,\n\n"
            "der Pilot hat uns überzeugt, die Warnung im August hat uns einen Stillstand erspart. "
            "Bitte schicken Sie mir ein Angebot für 20 Messstellen, damit ich das vor dem "
            "Pilotende freigeben kann. Den Termin für die Übernahme haben Sie ja im Blick.\n\n"
            "Gruß aus Fichtelhain\nBernd Kollmann"
        ),
    },
    {
        "id": "msg-1011",
        "threadId": "thr-nordmarsch-rahmen",
        "folder": "Posteingang",
        "from": _person("Katrin Lüders", "katrin.lueders@hafen-nordmarsch.example"),
        "to": [TOBIAS],
        "cc": [_person("Henrik Paulsen", "henrik.paulsen@hafen-nordmarsch.example")],
        "subject": "Rahmenvertrag Kranantriebe ab April 2027",
        "receivedAt": "2026-10-21T14:30:00+02:00",
        "read": True,
        "flagged": True,
        "customerId": "org-400",
        "related": {
            "tickets": ["SVC-1044"],
            "contracts": ["ctr-1006"],
            "deals": ["deal-402", "deal-401"],
        },
        "attachments": [],
        "body": (
            "Hallo Herr Lindner,\n\n"
            "wie angekündigt planen wir die Neuausschreibung des Rahmenvertrags. Wenn Sie uns bis "
            "Jahresende ein Verlängerungsangebot über drei Jahre machen, das preislich überzeugt, "
            "können wir uns die Ausschreibung sparen. Wichtig ist uns die 36-Stunden-Zusage für den Pool.\n\n"
            "Viele Grüße\nKatrin Lüders"
        ),
    },
    {
        "id": "msg-1010",
        "threadId": "thr-ellerbrook-referenz",
        "folder": "Posteingang",
        "from": _person("Thomas Ellerbrook", "thomas@brauhaus-ellerbrook.example"),
        "to": [SELIN],
        "cc": [],
        "subject": "Referenzbesuch",
        "receivedAt": "2026-10-19T19:05:00+02:00",
        "read": True,
        "flagged": False,
        "customerId": "org-700",
        "related": {"tickets": [], "contracts": [], "deals": ["deal-701"]},
        "attachments": [],
        "body": (
            "Hallo Frau Aydın,\n\n"
            "schön, dass wir uns auf der Messe kennengelernt haben. Gibt es einen Betrieb aus der "
            "Lebensmittelbranche, den wir uns anschauen könnten? Hygiene ist bei uns das große Thema.\n\n"
            "Prost\nThomas Ellerbrook"
        ),
    },
    {
        "id": "msg-1009",
        "threadId": "thr-reinhaus",
        "folder": "Posteingang",
        "from": _person("Paul Reinholz", "paul.reinholz@brakenstedt.example"),
        "to": [JANA],
        "cc": [VERTRIEB],
        "subject": "Reinigung: kündigen oder nachverhandeln?",
        "receivedAt": "2026-10-20T08:15:00+02:00",
        "read": True,
        "flagged": False,
        "customerId": None,
        "related": {"tickets": [], "contracts": ["ctr-2003"], "deals": []},
        "attachments": [],
        "body": (
            "Hallo Jana,\n\n"
            "die Reinigung war im Herbst dreimal mangelhaft, zuletzt im Besprechungsraum vor dem "
            "Rehwinkel-Termin. Kündigungsfrist ist der [[2026-11-19]]. Ich würde kündigen und neu "
            "ausschreiben, wenn du nichts dagegen hast.\n\nPaul"
        ),
    },
    {
        "id": "msg-1008",
        "threadId": "thr-kornfeld-verlaengerung",
        "folder": "Gesendet",
        "from": SELIN,
        "to": [_person("Anja Wiesner", "a.wiesner@kornfeld-muehle.example")],
        "cc": [],
        "subject": "Verlängerung Wartungsvertrag – Frist diese Woche",
        "receivedAt": "2026-10-21T09:30:00+02:00",
        "read": True,
        "flagged": False,
        "customerId": "org-300",
        "related": {"tickets": [], "contracts": ["ctr-1005"], "deals": ["deal-301"]},
        "attachments": [],
        "body": (
            "Sehr geehrte Frau Wiesner,\n\n"
            "danke für Ihre Nachricht. Wir rechnen die Siloaustragung gerade ein und melden uns "
            "in den nächsten Tagen mit einem Angebot für die Verlängerung.\n\n"
            "Mit freundlichen Grüßen\nSelin Aydın"
        ),
    },
    {
        "id": "msg-1007",
        "threadId": "thr-rehwinkel-pm3",
        "folder": "Gesendet",
        "from": SELIN,
        "to": [_person("Florian Hesse", "florian.hesse@papierfabrik-rehwinkel.example")],
        "cc": [],
        "subject": "Angebot Modernisierung Rollenantrieb PM3",
        "receivedAt": "2026-09-30T15:10:00+02:00",
        "read": True,
        "flagged": False,
        "customerId": "org-200",
        "related": {"tickets": [], "contracts": [], "deals": ["deal-201"]},
        "attachments": [{"name": "Angebot-A-2026-0412.pdf", "size": 412880}],
        "body": (
            "Sehr geehrter Herr Hesse,\n\n"
            "anbei unser Angebot über die Modernisierung des Rollenantriebs der PM3 "
            "(480.000 € netto, Lieferzeit Planetengetriebe 16 Wochen).\n\n"
            "Mit freundlichen Grüßen\nSelin Aydın"
        ),
    },
]
