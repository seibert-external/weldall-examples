from urllib.parse import urlsplit

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import JSONResponse
from weldall.adapters.fastapi import init_weldall

from data import FOLDERS, MAILBOX, MESSAGES
from dates import shift, shift_all, utc_now
from provider import provider_router
from replay import RedisReplayStore


def skills(origin):
    owner = {"owner": "Vertrieb"}
    return [
        {
            "id": "start-postfach",
            "title": "Was ist heute im Vertriebspostfach wichtig?",
            "requiredScopes": ["mail:read"],
            "visibility": "HIDDEN_IF_UNALLOWED",
            "content": (
                "# Was ist heute im Vertriebspostfach wichtig?\n"
                f"Lies die ungelesenen und markierten Nachrichten: weldall request --scope mail:read "
                f"'{origin}/api/messages?folder=Posteingang&unread=true' und '{origin}/api/messages?flagged=true'.\n"
                f"Eine Nachricht vollständig: {origin}/api/messages/{{id}}, ein Verlauf: {origin}/api/threads/{{threadId}}.\n"
                "Sortiere nach Dringlichkeit: Fristen im Text (Kündigung, Angebot, Ausschreibung), "
                "verärgerte Kunden, Entscheidungen mit Datum. Nenne je Nachricht Absender, Kunde, "
                "worum es geht, bis wann und wer aus dem Team zuständig ist (Empfänger).\n"
                "related verweist auf Verträge (contracts), Tickets und Verkaufschancen (deals); "
                "prüfe sie dort, wenn du Zugriff hast, statt Fristen aus dem Mailtext zu übernehmen.\n"
                "Schlage zu jeder wichtigen Nachricht eine kurze Antwort vor, sende aber nichts."
            ),
            "meta": {"tags": ["start", "postfach", "vertrieb"], **owner},
        },
        {
            "id": "search",
            "title": "Nachrichten eines Kunden finden",
            "requiredScopes": ["mail:read"],
            "visibility": "HIDDEN_IF_UNALLOWED",
            "content": (
                "# Nachrichten eines Kunden finden\n"
                f"Suche mit weldall request --scope mail:read '{origin}/api/messages?customerId=org-200' "
                "(CRM-Organisations-ID) oder mit ?q=<text> in Betreff, Absender und Text.\n"
                "Ergebnisse sind neueste zuerst und enthalten einen Auszug; lies die vollständige Nachricht "
                "über die ID. Gesendete Antworten liegen im Ordner Gesendet.\n"
                "Zitiere Fristen und Zusagen aus dem Text wörtlich mit Datum der Nachricht."
            ),
            "meta": {"tags": ["postfach", "kunden"], **owner},
        },
    ]


def create_app(config, redis, now=utc_now):
    origin = config["origin"]
    weldall = init_weldall(
        config["issuer"],
        {
            "resource": f"{origin}/api",
            "public_origin": origin,
            "client_id": "weldall-cli-at-mail",
            "supported_scopes": ["mail:read"],
            "signing_key": config["signing_key"],
            "replay_store": RedisReplayStore(redis),
            "skills": {"items": skills(origin)},
        },
    )
    app = FastAPI(title="Postfach", docs_url=None, redoc_url=None, openapi_url=None)
    public = urlsplit(origin)

    @app.middleware("http")
    async def canonical_origin(request, call_next):
        # Ignore forwarded host/proto supplied by clients; one configured public origin.
        request.scope["scheme"] = "https"
        request.scope["server"] = (public.hostname, public.port or 443)
        request.scope["headers"] = [
            (k, v) for k, v in request.scope["headers"] if k.lower() != b"host"
        ] + [(b"host", public.netloc.encode())]
        return await call_next(request)

    weldall.register_routes(app)
    app.include_router(provider_router(redis, config["provider_token"]))
    protected = [Depends(weldall.require_auth({"scopes": ["mail:read"]}))]
    cache = {}

    def messages():
        key = shift(now())
        if key not in cache:
            cache.clear()
            cache[key] = sorted(
                shift_all(MESSAGES, key), key=lambda m: m["receivedAt"], reverse=True
            )
        return cache[key]

    def summary(message):
        text = " ".join(message["body"].split())
        return {k: v for k, v in message.items() if k != "body"} | {"excerpt": text[:180]}

    @app.get("/")
    def root():
        return {
            "service": "Postfach",
            "authentication": "Weldall DPoP",
            "resource": f"{origin}/api",
        }

    @app.get("/health")
    def health():
        try:
            redis.ping()
            return {"status": "ok"}
        except Exception:
            return JSONResponse({"status": "unavailable"}, status_code=503)

    @app.get("/api/mailbox", dependencies=protected)
    def mailbox():
        items = messages()
        return {
            **MAILBOX,
            "folders": [
                {
                    "name": folder,
                    "total": sum(m["folder"] == folder for m in items),
                    "unread": sum(m["folder"] == folder and not m["read"] for m in items),
                }
                for folder in FOLDERS
            ],
        }

    @app.get("/api/messages", dependencies=protected)
    def search(
        folder: str | None = None,
        q: str = "",
        customerId: str | None = None,  # noqa: N803 - matches the other APIs
        unread: bool | None = None,
        flagged: bool | None = None,
    ):
        needle = q.lower()
        items = [
            summary(m)
            for m in messages()
            if (folder is None or m["folder"] == folder)
            and (customerId is None or m["customerId"] == customerId)
            and (unread is None or (not m["read"]) == unread)
            and (flagged is None or m["flagged"] == flagged)
            and (not needle or needle in f"{m['subject']} {m['from']['name']} {m['body']}".lower())
        ]
        return {"items": items, "total": len(items)}

    @app.get("/api/messages/{item_id}", dependencies=protected)
    def message(item_id: str):
        item = next((m for m in messages() if m["id"] == item_id), None)
        if item is None:
            raise HTTPException(status_code=404, detail="Keine Nachricht mit dieser ID.")
        return {"item": item}

    @app.get("/api/threads/{thread_id}", dependencies=protected)
    def thread(thread_id: str):
        items = [m for m in reversed(messages()) if m["threadId"] == thread_id]
        if not items:
            raise HTTPException(status_code=404, detail="Kein Verlauf mit dieser ID.")
        return {"items": items}

    @app.api_route(
        "/api/messages/{item_id}",
        methods=["POST", "PUT", "PATCH", "DELETE"],
        dependencies=protected,
    )
    def read_only(item_id: str):
        return JSONResponse(
            {
                "error": "read_only",
                "message": "Nur lesender Zugriff: Hier wird nichts geändert oder gelöscht.",
                "changed": False,
            },
            status_code=405,
            headers={"Allow": "GET, HEAD"},
        )

    return app
