from urllib.parse import urlsplit

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import JSONResponse
from weldall.adapters.fastapi import init_weldall

from data import ACTIVITIES, CONTACTS, ORGANIZATIONS
from provider import provider_router
from replay import RedisReplayStore


def create_app(config, redis):
    origin = config["origin"]
    weldall = init_weldall(
        config["issuer"],
        {
            "resource": f"{origin}/api",
            "public_origin": origin,
            "client_id": "weldall-cli-at-crm",
            "supported_scopes": ["crm:read"],
            "signing_key": config["signing_key"],
            "replay_store": RedisReplayStore(redis),
            "skills": {
                "items": [
                    {
                        "id": "briefing",
                        "title": "Account briefing",
                        "requiredScopes": ["crm:read"],
                        "visibility": "HIDDEN_IF_UNALLOWED",
                        "content": (
                            f"# Account briefing\n"
                            f"Start with weldall request --scope crm:read {origin}/api/organizations/org-100 for the account record.\n"
                            f"Add the people from {origin}/api/organizations/org-100/contacts and the history from {origin}/api/organizations/org-100/activities.\n"
                            f"Combine the three into one briefing: who the account is, its industry, its lifecycle status, the named contacts, and the most recent activity.\n"
                            f"contractIds lists the agreements held against the account; the contracts API resolves those IDs.\n"
                            f"Name the account that was briefed and state anything the record does not answer."
                        ),
                        "meta": {
                            "tags": ["crm", "accounts", "briefing"],
                            "owner": "Revenue Operations",
                        },
                    },
                    {
                        "id": "contacts",
                        "title": "Find a contact",
                        "requiredScopes": ["crm:read"],
                        "visibility": "HIDDEN_IF_UNALLOWED",
                        "content": (
                            f"# Find a contact\n"
                            f"Search by name with weldall request --scope crm:read '{origin}/api/contacts?q=alex'.\n"
                            f"q matches the name only, so try the surname when a full name returns nothing.\n"
                            f"Read the full record from {origin}/api/contacts/person-100, which carries role, email and organizationId.\n"
                            f"Resolve organizationId against {origin}/api/organizations/{{id}} before reporting a contact, so the employer is named rather than only an ID."
                        ),
                        "meta": {"tags": ["crm", "contacts"], "owner": "Revenue Operations"},
                    },
                    {
                        "id": "activity",
                        "title": "Recent account activity",
                        "requiredScopes": ["crm:read"],
                        "visibility": "HIDDEN_IF_UNALLOWED",
                        "content": (
                            f"# Recent account activity\n"
                            f"Read the engagement history with weldall request --scope crm:read {origin}/api/organizations/org-100/activities.\n"
                            f"Each entry carries date, type and summary; type is one of meeting, call, email or note.\n"
                            f"Order the entries by date and present the relationship as a timeline, calling out the most recent contact and any open question in the summaries.\n"
                            f"An account with no activities has not been contacted; say so instead of inferring history."
                        ),
                        "meta": {
                            "tags": ["crm", "activity", "engagement"],
                            "owner": "Revenue Operations",
                        },
                    },
                    {
                        "id": "pipeline",
                        "title": "Pipeline by lifecycle stage",
                        "requiredScopes": ["crm:read"],
                        "visibility": "HIDDEN_IF_UNALLOWED",
                        "content": (
                            f"# Pipeline by lifecycle stage\n"
                            f"List the accounts with weldall request --scope crm:read {origin}/api/organizations and group them by status: customer, prospect, lead or churned.\n"
                            f"Filter a single stage with ?status=prospect, or search by name with ?q=.\n"
                            f"Report how many accounts sit in each stage and which of them already hold contracts, since contractIds is empty until an agreement is registered.\n"
                            f"A churned account is lost business, not pipeline."
                        ),
                        "meta": {
                            "tags": ["crm", "pipeline", "sales"],
                            "owner": "Revenue Operations",
                        },
                    },
                ]
            },
        },
    )
    app = FastAPI(title="Customer records API", docs_url=None, redoc_url=None, openapi_url=None)
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
    protected = [Depends(weldall.require_auth({"scopes": ["crm:read"]}))]

    @app.get("/")
    def root():
        return {
            "service": "CRM API",
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

    def find(items, item_id):
        item = next((x for x in items if x["id"] == item_id), None)
        if item is None:
            raise HTTPException(status_code=404, detail="Record not found")
        return item

    @app.get("/api/organizations", dependencies=protected)
    def organizations(q: str = "", status: str | None = None):
        items = [
            x
            for x in ORGANIZATIONS
            if q.lower() in x["name"].lower() and (status is None or x["status"] == status)
        ]
        return {"items": items, "total": len(items)}

    @app.get("/api/organizations/{item_id}", dependencies=protected)
    def organization(item_id: str):
        return {"item": find(ORGANIZATIONS, item_id)}

    @app.get("/api/organizations/{item_id}/contacts", dependencies=protected)
    def organization_contacts(item_id: str):
        find(ORGANIZATIONS, item_id)
        return {"items": [x for x in CONTACTS if x["organizationId"] == item_id]}

    @app.get("/api/organizations/{item_id}/activities", dependencies=protected)
    def activities(item_id: str):
        find(ORGANIZATIONS, item_id)
        return {"items": [x for x in ACTIVITIES if x["organizationId"] == item_id]}

    @app.get("/api/contacts", dependencies=protected)
    def contacts(q: str = ""):
        items = [x for x in CONTACTS if q.lower() in x["name"].lower()]
        return {"items": items, "total": len(items)}

    @app.get("/api/contacts/{item_id}", dependencies=protected)
    def contact(item_id: str):
        return {"item": find(CONTACTS, item_id)}

    @app.delete("/api/organizations/{item_id}", dependencies=protected)
    @app.delete("/api/contacts/{item_id}", dependencies=protected)
    def read_only_delete(item_id: str):
        return JSONResponse(
            {"error": "demo_read_only", "message": "This is just a demo", "deleted": False},
            status_code=405,
            headers={"Allow": "GET, HEAD"},
        )

    return app
