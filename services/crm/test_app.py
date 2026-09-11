import threading
import time
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from weldall import create_dpop_proof, generate_es256_key_pair, issue_access_token

from app import create_app
from config import public_origin
from replay import RedisReplayStore

ORIGIN = "https://crm.weldall.example.com"
TOKEN = "test-provider-token-" + "a" * 32


class MemoryRedis:
    """Redis transport double only; route auth runs the actual published SDK."""

    def __init__(self):
        self.values = {}
        self.lock = threading.Lock()
        self.offline = False

    def ping(self):
        if self.offline:
            raise ConnectionError("offline")
        return True

    def set(self, key, value, nx=False, pxat=None, ex=None):
        self.ping()
        with self.lock:
            self.values = {k: v for k, v in self.values.items() if v[1] > time.time()}
            if nx and key in self.values:
                return False
            self.values[key] = (value, pxat / 1000 if pxat else time.time() + (ex or 300))
            return True

    def get(self, key):
        self.ping()
        value = self.values.get(key)
        return value[0] if value and value[1] > time.time() else None


@pytest.fixture
def fixture():
    key = generate_es256_key_pair()
    device = generate_es256_key_pair()
    redis = MemoryRedis()
    app = create_app(
        {
            "issuer": "https://weldall.example.com",
            "origin": ORIGIN,
            "signing_key": {"kid": "test", **key},
            "provider_token": TOKEN,
        },
        redis,
    )
    client = TestClient(app, base_url="http://internal:8000")

    def headers(path, method="GET", scopes=None, proof_origin=ORIGIN):
        token = issue_access_token(
            issuer=ORIGIN,
            subject="user-1",
            email="visitor@example.com",
            resource=f"{ORIGIN}/api",
            client_id="weldall-cli-at-crm",
            scopes=scopes if scopes is not None else ["crm:read"],
            jkt=device["jkt"],
            kid="test",
            private_jwk=key["private_jwk"],
        )
        proof = create_dpop_proof(
            {**device, "method": method, "url": f"{proof_origin}{path}", "access_token": token}
        )
        return {
            "authorization": f"DPoP {token}",
            "dpop": proof,
            "x-forwarded-host": "attacker.example",
            "x-forwarded-proto": "http",
        }

    return client, headers, redis


def test_health_metadata_and_missing_auth(fixture):
    client, _, _ = fixture
    assert client.get("/health").status_code == 200
    metadata = client.get("/.well-known/oauth-authorization-server").json()
    assert metadata["issuer"] == ORIGIN
    assert metadata["token_endpoint"] == f"{ORIGIN}/oauth/token"
    resource = client.get("/.well-known/oauth-protected-resource").json()
    assert resource["weldall_skills_endpoint"] == f"{ORIGIN}/.well-known/weldall-skills"
    assert "d" not in client.get("/.well-known/jwks.json").json()["keys"][0]
    assert client.get("/.well-known/weldall-skills").status_code == 401
    assert client.get("/api/organizations").status_code == 401
    assert client.get("/api/contacts").status_code == 401


def test_real_sdk_scope_proof_replay_and_reads(fixture):
    client, headers, _ = fixture
    path = "/api/organizations?q=northstar"
    # Only crm:read is supported; a token with solely another scope is invalid.
    assert client.get(path, headers=headers(path, scopes=["other:read"])).status_code == 401
    assert (
        client.get(path, headers=headers(path, proof_origin="https://attacker.example")).status_code
        == 401
    )
    auth = headers(path)
    result = client.get(path, headers=auth)
    assert result.status_code == 200
    assert result.json()["items"][0]["id"] == "org-100"
    assert client.get(path, headers=auth).status_code == 401
    for path in [
        "/api/organizations/org-100",
        "/api/organizations/org-100/contacts",
        "/api/organizations/org-100/activities",
        "/api/contacts",
        "/api/contacts/person-100",
    ]:
        assert client.get(path, headers=headers(path)).status_code == 200
    path = "/api/contacts/missing"
    assert client.get(path, headers=headers(path)).status_code == 404


def test_delete_is_authenticated_friendly_and_does_not_mutate(fixture):
    client, headers, _ = fixture
    for path in ["/api/organizations/org-100", "/api/contacts/person-100"]:
        before = client.get(path, headers=headers(path)).json()
        assert client.delete(path).status_code == 401
        result = client.delete(path, headers=headers(path, "DELETE"))
        assert result.status_code == 405
        assert result.json()["message"] == "This is just a demo"
        assert result.json()["deleted"] is False
        assert client.get(path, headers=headers(path)).json() == before


def test_provider_is_separate_token_authenticated_and_grants_only_readers(fixture):
    client, headers, redis = fixture
    auth = {"authorization": f"Token {TOKEN}"}
    assert client.get("/api/management/groups/").status_code == 401
    assert (
        client.get(
            "/api/management/groups/", headers=headers("/api/management/groups/")
        ).status_code
        == 401
    )
    assert client.get("/api/organizations", headers=auth).status_code == 401
    assert client.get("/api/management/groups/", headers=auth).json()[0]["ou"] == "demo-readers"
    for email in [
        "visitor@example.com",
        "a" * 64 + "@" + ".".join(["b" * 60, "c" * 60, "d" * 55, "com"]),
    ]:
        result = client.get(
            "/api/management/users/", params={"mail": f" {email.upper()} "}, headers=auth
        )
        user = result.json()[0]
        assert user["email"] == email
        assert len(user["username"]) <= 191
        detail = client.get(f"/api/management/users/{user['username']}/", headers=auth).json()
        assert detail["email"] == email
        assert detail["groups"] == ["demo-readers"]
        assert all(expiry <= time.time() + 300 for _, expiry in redis.values.values())
    assert (
        client.get("/api/management/users/", params={"mail": "invalid"}, headers=auth).json() == []
    )
    assert client.get("/api/management/users/not-valid/", headers=auth).status_code == 404


def test_replay_expiry_concurrency_and_outage_fail_closed(fixture):
    client, headers, redis = fixture
    store = RedisReplayStore(redis)
    assert store.consume("old", datetime.now(UTC) - timedelta(seconds=1)) is False
    assert store.consume("proof", datetime.now(UTC) + timedelta(minutes=1)) is True
    assert store.consume("proof", datetime.now(UTC) + timedelta(minutes=1)) is False
    assert next(iter(redis.values)).startswith("crm:replay:")
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(max_workers=10) as pool:
        assert (
            sum(
                pool.map(
                    lambda _: store.consume("parallel", datetime.now(UTC) + timedelta(minutes=1)),
                    range(20),
                )
            )
            == 1
        )
    auth = headers("/api/organizations")
    redis.offline = True
    assert client.get("/health").status_code == 503
    assert client.get("/api/organizations", headers=auth).status_code == 503


def test_real_id_jag_exchange_and_skill_catalog(monkeypatch):
    from weldall import JWT_DPOP_GRANT, issue_id_jag, sign_es256
    from weldall.discovery import WeldallDiscovery

    issuer = "https://weldall.example.com"
    issuer_key = generate_es256_key_pair()
    key = generate_es256_key_pair()
    device = generate_es256_key_pair()

    def fetch_json(self, url):
        if url == f"{issuer}/.well-known/oauth-authorization-server":
            return {"issuer": issuer, "jwks_uri": f"{issuer}/jwks"}
        assert url == f"{issuer}/jwks"
        return {
            "keys": [{**issuer_key["public_jwk"], "kid": "issuer", "alg": "ES256", "use": "sig"}]
        }

    monkeypatch.setattr(WeldallDiscovery, "_fetch_json", fetch_json)
    app = create_app(
        {
            "issuer": issuer,
            "origin": ORIGIN,
            "signing_key": {"kid": "local", **key},
            "provider_token": TOKEN,
        },
        MemoryRedis(),
    )
    client = TestClient(app, base_url="http://internal:8000")
    assertion = issue_id_jag(
        issuer=issuer,
        subject="user-1",
        email="visitor@example.com",
        audience=ORIGIN,
        client_id="weldall-cli-at-crm",
        resource=f"{ORIGIN}/api",
        scopes=["crm:read"],
        jkt=device["jkt"],
        kid="issuer",
        private_jwk=issuer_key["private_jwk"],
    )
    proof = create_dpop_proof({**device, "method": "POST", "url": f"{ORIGIN}/oauth/token"})
    response = client.post(
        "/oauth/token",
        data={"grant_type": JWT_DPOP_GRANT, "assertion": assertion},
        headers={"dpop": proof},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    proof = create_dpop_proof(
        {**device, "method": "GET", "url": f"{ORIGIN}/api/organizations", "access_token": token}
    )
    assert (
        client.get(
            "/api/organizations", headers={"authorization": f"DPoP {token}", "dpop": proof}
        ).status_code
        == 200
    )
    now = int(time.time())
    assertion = sign_es256(
        {
            "iss": issuer,
            "sub": issuer,
            "aud": f"{ORIGIN}/.well-known/weldall-skills",
            "resource": f"{ORIGIN}/api",
            "purpose": "skills:read",
            "iat": now,
            "exp": now + 60,
            "jti": "skill-test",
        },
        kid="issuer",
        private_jwk=issuer_key["private_jwk"],
        typ="weldall-skills+jwt",
    )
    auth = {"authorization": f"Bearer {assertion}"}
    response = client.get("/.well-known/weldall-skills", headers=auth)
    assert response.status_code == 200
    assert response.json()["skills"][0]["id"] == "explore"
    assert response.json()["skills"][0]["requiredScopes"] == ["crm:read"]
    assert client.get("/.well-known/weldall-skills", headers=auth).status_code == 401


def test_invalid_origin_rejected():
    for value in ["http://example.com", f"{ORIGIN}/", f"{ORIGIN}/path", f"{ORIGIN}?x=1"]:
        with pytest.raises(ValueError):
            public_origin(value)
