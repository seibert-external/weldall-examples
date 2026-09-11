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
                        "id": "explore",
                        "title": "Explore demo customers",
                        "requiredScopes": ["crm:read"],
                        "visibility": "HIDDEN_IF_UNALLOWED",
                        "content": f"# Explore demo CRM\nAll records are fictional. Run weldall request --scope crm:read {origin}/api/organizations. Search with ?q=northstar. Read /api/organizations/org-100, /api/organizations/org-100/contacts and /api/organizations/org-100/activities. List /api/contacts or read /api/contacts/person-100. contractIds refer to the contracts API. DELETE is a safe no-op returning 405.",
                        "meta": {"tags": ["crm", "demo"], "owner": "Weldall demo"},
                    }
                ]
            },
        },
    )
    app = FastAPI(title="Fictional CRM demo", docs_url=None, redoc_url=None, openapi_url=None)
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
            "demo": True,
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
        return {"demo": True, "items": items, "total": len(items)}

    @app.get("/api/organizations/{item_id}", dependencies=protected)
    def organization(item_id: str):
        return {"demo": True, "item": find(ORGANIZATIONS, item_id)}

    @app.get("/api/organizations/{item_id}/contacts", dependencies=protected)
    def organization_contacts(item_id: str):
        find(ORGANIZATIONS, item_id)
        return {"demo": True, "items": [x for x in CONTACTS if x["organizationId"] == item_id]}

    @app.get("/api/organizations/{item_id}/activities", dependencies=protected)
    def activities(item_id: str):
        find(ORGANIZATIONS, item_id)
        return {"demo": True, "items": [x for x in ACTIVITIES if x["organizationId"] == item_id]}

    @app.get("/api/contacts", dependencies=protected)
    def contacts(q: str = ""):
        items = [x for x in CONTACTS if q.lower() in x["name"].lower()]
        return {"demo": True, "items": items, "total": len(items)}

    @app.get("/api/contacts/{item_id}", dependencies=protected)
    def contact(item_id: str):
        return {"demo": True, "item": find(CONTACTS, item_id)}

    @app.delete("/api/organizations/{item_id}", dependencies=protected)
    @app.delete("/api/contacts/{item_id}", dependencies=protected)
    def demo_delete(item_id: str):
        return JSONResponse(
            {"error": "demo_read_only", "message": "This is just a demo", "deleted": False},
            status_code=405,
            headers={"Allow": "GET, HEAD"},
        )

    return app
