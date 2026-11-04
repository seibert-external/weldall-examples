"""English version of data.py: shared sales mailbox of Brakenstedt Antriebstechnik
GmbH (invented company).

customerId values are CRM organisation IDs; related IDs point into the contract
register, the ticket system and the CRM pipeline. Timestamps are written as of
28 October 2026 and move with the calendar (see dates.py). Folder values stay as
in data.py because the API filters on them.
"""

MAILBOX = {
    "address": "vertrieb@brakenstedt.example",
    "name": "Brakenstedt Sales",
    "members": ["Jana Hartwig", "Tobias Lindner", "Selin Aydın"],
}

FOLDERS = ["Posteingang", "Gesendet"]


def _person(name, email):
    return {"name": name, "email": email}


SELIN = _person("Selin Aydın", "selin.aydin@brakenstedt.example")
TOBIAS = _person("Tobias Lindner", "tobias.lindner@brakenstedt.example")
JANA = _person("Jana Hartwig", "jana.hartwig@brakenstedt.example")
VERTRIEB = _person("Brakenstedt Sales", "vertrieb@brakenstedt.example")

MESSAGES = [
    {
        "id": "msg-1018",
        "threadId": "thr-rehwinkel-pm3",
        "folder": "Posteingang",
        "from": _person("Carsten Meißner", "carsten.meissner@papierfabrik-rehwinkel.example"),
        "to": [VERTRIEB],
        "cc": [_person("Ute Blum", "ute.blum@papierfabrik-rehwinkel.example")],
        "subject": "PM3: bearing damage and your modernisation offer",
        "receivedAt": "2026-10-28T09:12:00+01:00",
        "read": False,
        "flagged": True,
        "customerId": "org-200",
        "related": {"tickets": ["SVC-1042"], "contracts": ["ctr-1003"], "deals": ["deal-201"]},
        "attachments": [],
        "body": (
            "Dear Ms Aydın,\n\n"
            "Your technician has been working on PM3 since early this morning, thank you for the "
            "quick response. If the bearing damage is confirmed, this will be the third unplanned "
            "intervention on the main drive this year.\n\n"
            "This strengthens our case for bringing forward the modernisation of the roll drive. "
            "Please send us the offer by the end of next week, including the financing option we "
            "discussed at the quarterly review. Our board will decide in December.\n\n"
            "Our service contract is also due to expire. We would like to renew it, but we want "
            "to discuss the night-time response times.\n\n"
            "Kind regards\nCarsten Meißner\nTechnical Director, Papierfabrik Rehwinkel AG"
        ),
    },
    {
        "id": "msg-1017",
        "threadId": "thr-kornfeld-verlaengerung",
        "folder": "Posteingang",
        "from": _person("Anja Wiesner", "a.wiesner@kornfeld-muehle.example"),
        "to": [SELIN],
        "cc": [VERTRIEB],
        "subject": "RE: Maintenance contract renewal: deadline this week",
        "receivedAt": "2026-10-27T17:40:00+01:00",
        "read": False,
        "flagged": True,
        "customerId": "org-300",
        "related": {"tickets": ["SVC-1047"], "contracts": ["ctr-1005"], "deals": ["deal-301"]},
        "attachments": [],
        "body": (
            "Hello Ms Aydın,\n\n"
            "We still have not received your offer. Under the contract we would have to give "
            "notice by [[2026-10-31]], otherwise it renews for another year. In principle we want "
            "to continue, but only with the silo discharge included in the scope and without a "
            "major price increase.\n\n"
            "If nothing arrives by Friday, I will have to give notice as a precaution.\n\n"
            "Best regards\nAnja Wiesner\nManaging Director, Kornfeld Mühlenbetriebe KG"
        ),
    },
    {
        "id": "msg-1016",
        "threadId": "thr-haselgrund-v2",
        "folder": "Posteingang",
        "from": _person("Svenja Rohde", "svenja.rohde@haselgrund-recycling.example"),
        "to": [TOBIAS],
        "cc": [],
        "subject": "Cost estimate for gearbox V2: query",
        "receivedAt": "2026-10-27T11:05:00+01:00",
        "read": True,
        "flagged": False,
        "customerId": "org-1100",
        "related": {"tickets": ["SVC-1041"], "contracts": ["ctr-1012"], "deals": []},
        "attachments": [{"name": "KV-2026-1184.pdf", "size": 182340}],
        "body": (
            "Hello Mr Lindner,\n\n"
            "EUR 14,200 for the repair is more than we had budgeted. Could you tell us whether a "
            "replacement gearbox would be cheaper in the long run? The pool gearbox is running "
            "perfectly.\n\n"
            "Also, Mr Kessling would like a service contract for the new V3 straight away, the "
            "same as for V1 and V2.\n\n"
            "Regards\nSvenja Rohde"
        ),
    },
    {
        "id": "msg-1015",
        "threadId": "thr-belegwerk-preis",
        "folder": "Posteingang",
        "from": _person("Belegwerk Customer Service", "kundenservice@belegwerk.example"),
        "to": [_person("Paul Reinholz", "paul.reinholz@brakenstedt.example")],
        "cc": [VERTRIEB],
        "subject": "Belegwerk price adjustment as of [[2027-01-01]]",
        "receivedAt": "2026-10-26T08:00:00+01:00",
        "read": True,
        "flagged": False,
        "customerId": None,
        "related": {"tickets": ["IT-312"], "contracts": ["ctr-2001"], "deals": []},
        "attachments": [{"name": "Preisblatt-2027.pdf", "size": 96512}],
        "body": (
            "Dear Sir or Madam,\n\n"
            "In accordance with your licence agreement, we are adjusting the annual fee by 4.5% "
            "as of [[2027-01-01]]. Your new annual fee is EUR 30,200.50 net.\n\n"
            "Kind regards\nYour Belegwerk team"
        ),
    },
    {
        "id": "msg-1014",
        "threadId": "thr-kargrat-revision",
        "folder": "Posteingang",
        "from": _person("Matthias Ortner", "m.ortner@bergbahnen-kargrat.example"),
        "to": [SELIN],
        "cc": [],
        "subject": "Gipfelexpress overhaul: need confirmation by Friday",
        "receivedAt": "2026-10-26T16:22:00+01:00",
        "read": True,
        "flagged": True,
        "customerId": "org-1200",
        "related": {"tickets": [], "contracts": [], "deals": ["deal-1201"]},
        "attachments": [],
        "body": (
            "Hello Ms Aydın,\n\n"
            "Your offer works for us on price. However, I need a firm commitment that the "
            "overhaul will be completed by [[2026-12-01]], otherwise I will have to go with the "
            "other supplier. The season starts on 12 December.\n\n"
            "Best wishes\nMatthias Ortner"
        ),
    },
    {
        "id": "msg-1013",
        "threadId": "thr-grauenbach-vergabe",
        "folder": "Posteingang",
        "from": _person(
            "Talsperrenverband Procurement Office", "vergabe@talsperren-grauenbach.example"
        ),
        "to": [TOBIAS],
        "cc": [],
        "subject": "Tender SA-2026-14 gate drives: answers to bidder questions",
        "receivedAt": "2026-10-23T10:00:00+02:00",
        "read": True,
        "flagged": False,
        "customerId": "org-500",
        "related": {"tickets": ["SVC-1043"], "contracts": ["ctr-1007"], "deals": ["deal-501"]},
        "attachments": [{"name": "Bieterinformation-02.pdf", "size": 241001}],
        "body": (
            "Dear bidders,\n\n"
            "Please find attached the answers to the bidder questions received so far. The bid "
            "deadline remains unchanged at [[2026-11-13]], 12:00 noon. Any further questions must "
            "be submitted by [[2026-11-04]] exclusively via the procurement platform.\n\n"
            "Kind regards\nProcurement Office"
        ),
    },
    {
        "id": "msg-1012",
        "threadId": "thr-fichtelhain-pilot",
        "folder": "Posteingang",
        "from": _person("Bernd Kollmann", "b.kollmann@saegewerk-fichtelhain.example"),
        "to": [SELIN],
        "cc": [],
        "subject": "BRK Monitor pilot: what are the next steps?",
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
            "Hello Ms Aydın,\n\n"
            "The pilot has convinced us: the warning in August saved us a shutdown. Please send "
            "me an offer for 20 measuring points so that I can approve it before the pilot ends. "
            "I trust you are keeping an eye on the date for the handover.\n\n"
            "Best regards from Fichtelhain\nBernd Kollmann"
        ),
    },
    {
        "id": "msg-1011",
        "threadId": "thr-nordmarsch-rahmen",
        "folder": "Posteingang",
        "from": _person("Katrin Lüders", "katrin.lueders@hafen-nordmarsch.example"),
        "to": [TOBIAS],
        "cc": [_person("Henrik Paulsen", "henrik.paulsen@hafen-nordmarsch.example")],
        "subject": "Framework agreement for crane drives from April 2027",
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
            "Hello Mr Lindner,\n\n"
            "As announced, we are planning to re-tender the framework agreement. If you send us "
            "a competitively priced three-year renewal offer by the end of the year, we can skip "
            "the tender. The 36-hour commitment for the pool is important to us.\n\n"
            "Best regards\nKatrin Lüders"
        ),
    },
    {
        "id": "msg-1010",
        "threadId": "thr-ellerbrook-referenz",
        "folder": "Posteingang",
        "from": _person("Thomas Ellerbrook", "thomas@brauhaus-ellerbrook.example"),
        "to": [SELIN],
        "cc": [],
        "subject": "Reference visit",
        "receivedAt": "2026-10-19T19:05:00+02:00",
        "read": True,
        "flagged": False,
        "customerId": "org-700",
        "related": {"tickets": [], "contracts": [], "deals": ["deal-701"]},
        "attachments": [],
        "body": (
            "Hello Ms Aydın,\n\n"
            "It was good to meet you at the trade fair. Is there a company in the food industry "
            "that we could visit? Hygiene is the big issue for us.\n\n"
            "Cheers\nThomas Ellerbrook"
        ),
    },
    {
        "id": "msg-1009",
        "threadId": "thr-reinhaus",
        "folder": "Posteingang",
        "from": _person("Paul Reinholz", "paul.reinholz@brakenstedt.example"),
        "to": [JANA],
        "cc": [VERTRIEB],
        "subject": "Cleaning: terminate or renegotiate?",
        "receivedAt": "2026-10-20T08:15:00+02:00",
        "read": True,
        "flagged": False,
        "customerId": None,
        "related": {"tickets": [], "contracts": ["ctr-2003"], "deals": []},
        "attachments": [],
        "body": (
            "Hi Jana,\n\n"
            "The cleaning was unsatisfactory three times this autumn, most recently in the meeting "
            "room before the Rehwinkel appointment. The notice deadline is [[2026-11-19]]. I would "
            "terminate and put it out to tender again, if you have no objection.\n\nPaul"
        ),
    },
    {
        "id": "msg-1008",
        "threadId": "thr-kornfeld-verlaengerung",
        "folder": "Gesendet",
        "from": SELIN,
        "to": [_person("Anja Wiesner", "a.wiesner@kornfeld-muehle.example")],
        "cc": [],
        "subject": "Maintenance contract renewal: deadline this week",
        "receivedAt": "2026-10-21T09:30:00+02:00",
        "read": True,
        "flagged": False,
        "customerId": "org-300",
        "related": {"tickets": [], "contracts": ["ctr-1005"], "deals": ["deal-301"]},
        "attachments": [],
        "body": (
            "Dear Ms Wiesner,\n\n"
            "Thank you for your message. We are currently pricing in the silo discharge and will "
            "get back to you in the next few days with an offer for the renewal.\n\n"
            "Kind regards\nSelin Aydın"
        ),
    },
    {
        "id": "msg-1007",
        "threadId": "thr-rehwinkel-pm3",
        "folder": "Gesendet",
        "from": SELIN,
        "to": [_person("Florian Hesse", "florian.hesse@papierfabrik-rehwinkel.example")],
        "cc": [],
        "subject": "Offer: modernisation of the PM3 roll drive",
        "receivedAt": "2026-09-30T15:10:00+02:00",
        "read": True,
        "flagged": False,
        "customerId": "org-200",
        "related": {"tickets": [], "contracts": [], "deals": ["deal-201"]},
        "attachments": [{"name": "Angebot-A-2026-0412.pdf", "size": 412880}],
        "body": (
            "Dear Mr Hesse,\n\n"
            "Please find attached our offer for the modernisation of the PM3 roll drive "
            "(EUR 480,000 net, delivery time for the planetary gearbox 16 weeks).\n\n"
            "Kind regards\nSelin Aydın"
        ),
    },
]
