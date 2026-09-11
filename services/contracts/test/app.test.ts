import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDpopProof,
  generateEs256KeyPair,
  inMemory,
  issueAccessToken,
  issueIdJag,
  signEs256,
  JWT_DPOP_GRANT,
} from "@weldall/sdk";
import { createApp } from "../src/app.js";
import { publicOrigin } from "../src/config.js";
import { replayStore } from "../src/replay.js";

const origin = "https://contracts.weldall.example.com";
async function fixture() {
  const key = await generateEs256KeyPair();
  const device = await generateEs256KeyPair();
  const config = {
    issuer: "https://weldall.example.com",
    origin,
    signingKey: { kid: "test", ...key },
  };
  const app = createApp(
    config,
    inMemory({ suppressWarning: true }),
    async () => "PONG",
  );
  const token = async (scopes = ["contracts:read"]) =>
    issueAccessToken({
      issuer: origin,
      subject: "user-1",
      email: "visitor@example.com",
      resource: `${origin}/api`,
      clientId: "weldall-cli-at-contracts",
      scopes,
      jkt: device.jkt,
      kid: "test",
      privateJwk: key.privateJwk,
    });
  const request = async (
    path: string,
    method = "GET",
    scopes = ["contracts:read"],
    proofOrigin = origin,
  ) => {
    const accessToken = await token(scopes);
    const proof = await createDpopProof({
      ...device,
      method,
      url: `${proofOrigin}${path}`,
      accessToken,
    });
    return new Request(`http://internal:3001${path}`, {
      method,
      headers: {
        authorization: `DPoP ${accessToken}`,
        dpop: proof,
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "http",
      },
    });
  };
  return { ...app, request };
}

test("public health and metadata expose canonical HTTPS URLs, not signing secrets", async () => {
  const app = await fixture();
  assert.equal(
    (await app.fetch(new Request("http://internal/health"))).status,
    200,
  );
  const response = await app.fetch(
    new Request("http://internal/.well-known/oauth-authorization-server"),
  );
  const metadata = await response.json();
  assert.equal(metadata.issuer, origin);
  assert.equal(metadata.token_endpoint, `${origin}/oauth/token`);
  const resource = await (
    await app.fetch(
      new Request("http://internal/.well-known/oauth-protected-resource"),
    )
  ).json();
  assert.equal(
    resource.weldall_skills_endpoint,
    `${origin}/.well-known/weldall-skills`,
  );
  const keys = await (
    await app.fetch(new Request("http://internal/.well-known/jwks.json"))
  ).json();
  assert.equal(keys.keys[0].d, undefined);
  assert.equal(
    (await app.fetch(new Request("http://internal/.well-known/weldall-skills")))
      .status,
    401,
  );
});

test("real SDK authentication: missing token, scope denial, public-origin proof and replay", async () => {
  const app = await fixture();
  assert.equal(
    (await app.fetch(new Request("http://internal/api/contracts"))).status,
    401,
  );
  // With one supported scope, a token containing only another scope is invalid (401).
  assert.equal(
    (
      await app.fetch(
        await app.request("/api/contracts", "GET", ["other:read"]),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await app.fetch(
        await app.request(
          "/api/contracts",
          "GET",
          ["contracts:read"],
          "https://attacker.example",
        ),
      )
    ).status,
    401,
  );
  const request = await app.request("/api/contracts?q=support");
  const duplicate = request.clone();
  const response = await app.fetch(request);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).items[0].id, "ctr-1001");
  assert.equal((await app.fetch(duplicate)).status, 401);
});

test("detail, filtering, related records, friendly authenticated delete preserve fixtures", async () => {
  const app = await fixture();
  const get = async (path: string) =>
    (await app.fetch(await app.request(path))).json();
  const before = await get("/api/contracts");
  assert.equal((await get("/api/contracts?customerId=org-100")).total, 3);
  assert.equal((await get("/api/contracts?status=draft")).total, 5);
  assert.equal((await get("/api/contracts/ctr-1001/clauses")).items.length, 2);
  assert.equal(
    (await app.fetch(await app.request("/api/contracts/missing"))).status,
    404,
  );
  assert.equal(
    (
      await app.fetch(
        new Request("http://internal/api/contracts/ctr-1001", {
          method: "DELETE",
        }),
      )
    ).status,
    401,
  );
  const response = await app.fetch(
    await app.request("/api/contracts/ctr-1001", "DELETE"),
  );
  assert.equal(response.status, 405);
  assert.equal((await response.json()).message, "This is just a demo");
  assert.deepEqual(await get("/api/contracts"), before);
});

test("replay store hashes namespaced keys, rejects expiry, propagates outage", async () => {
  const entries = new Set<string>();
  const store = replayStore({
    async set(key, _value, options) {
      assert.equal(options.NX, true);
      assert.match(key, /^contracts:replay:[a-f0-9]{64}$/);
      if (entries.has(key)) return null;
      entries.add(key);
      return "OK";
    },
  });
  assert.equal(await store.consume("expired", new Date(0)), false);
  assert.equal(await store.consume("invalid", new Date(NaN)), false);
  assert.equal(
    (
      await Promise.all(
        Array.from({ length: 20 }, () =>
          store.consume("same", new Date(Date.now() + 60000)),
        ),
      )
    ).filter(Boolean).length,
    1,
  );
  await assert.rejects(
    replayStore({
      async set() {
        throw new Error("offline");
      },
    }).consume("key", new Date(Date.now() + 60000)),
    /offline/,
  );
  const key = await generateEs256KeyPair();
  const failed = createApp(
    {
      issuer: "https://weldall.example.com",
      origin,
      signingKey: { kid: "test", ...key },
    },
    store,
    async () => {
      throw new Error("offline");
    },
  );
  assert.equal(
    (await failed.fetch(new Request("http://internal/health"))).status,
    503,
  );
});

test("real ID-JAG exchange and authenticated skill catalog discovery", async () => {
  const issuer = "https://weldall.example.com";
  const issuerKey = await generateEs256KeyPair();
  const key = await generateEs256KeyPair();
  const device = await generateEs256KeyPair();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === `${issuer}/.well-known/oauth-authorization-server`)
      return Response.json({ issuer, jwks_uri: `${issuer}/jwks` });
    if (url === `${issuer}/jwks`)
      return Response.json({
        keys: [
          { ...issuerKey.publicJwk, kid: "issuer", alg: "ES256", use: "sig" },
        ],
      });
    throw new Error(`Unexpected discovery URL: ${url}`);
  };
  try {
    const app = createApp(
      { issuer, origin, signingKey: { kid: "local", ...key } },
      inMemory({ suppressWarning: true }),
      async () => "PONG",
    );
    const assertion = await issueIdJag({
      issuer,
      subject: "user-1",
      email: "visitor@example.com",
      audience: origin,
      clientId: "weldall-cli-at-contracts",
      resource: `${origin}/api`,
      scopes: ["contracts:read"],
      jkt: device.jkt,
      kid: "issuer",
      privateJwk: issuerKey.privateJwk,
    });
    const proof = await createDpopProof({
      ...device,
      method: "POST",
      url: `${origin}/oauth/token`,
    });
    const exchange = await app.fetch(
      new Request("http://internal/oauth/token", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          dpop: proof,
        },
        body: new URLSearchParams({ grant_type: JWT_DPOP_GRANT, assertion }),
      }),
    );
    assert.equal(exchange.status, 200);
    const token = (await exchange.json()).access_token;
    const dpop = await createDpopProof({
      ...device,
      method: "GET",
      url: `${origin}/api/contracts`,
      accessToken: token,
    });
    assert.equal(
      (
        await app.fetch(
          new Request("http://internal/api/contracts", {
            headers: { authorization: `DPoP ${token}`, dpop },
          }),
        )
      ).status,
      200,
    );
    const now = Math.floor(Date.now() / 1000);
    const skillAssertion = await signEs256(
      {
        iss: issuer,
        sub: issuer,
        aud: `${origin}/.well-known/weldall-skills`,
        resource: `${origin}/api`,
        purpose: "skills:read",
        iat: now,
        exp: now + 60,
        jti: "skill-test",
      },
      {
        kid: "issuer",
        privateJwk: issuerKey.privateJwk,
        typ: "weldall-skills+jwt",
      },
    );
    const request = new Request("http://internal/.well-known/weldall-skills", {
      headers: { authorization: `Bearer ${skillAssertion}` },
    });
    const catalog = await app.fetch(request.clone());
    assert.equal(catalog.status, 200);
    const body = await catalog.json();
    assert.deepEqual(
      body.skills.map((skill: { id: string }) => skill.id),
      ["overview", "review", "renewals", "by-account"],
    );
    for (const skill of body.skills)
      assert.deepEqual(skill.requiredScopes, ["contracts:read"]);
    // Published skills are read by agents; keep them free of demo framing.
    const published = JSON.stringify(body.skills);
    for (const tell of ["demo", "Demo", "fictional", "Fictional", "mock", "synthetic"])
      assert.equal(published.includes(tell), false, `skill catalog leaks "${tell}"`);
    assert.equal(body.resource, `${origin}/api`);
    assert.equal((await app.fetch(request)).status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("only HTTPS origins accepted", () => {
  for (const value of [
    "http://example.com",
    `${origin}/`,
    `${origin}/path`,
    `${origin}?x=1`,
  ])
    assert.throws(() => publicOrigin(value));
  assert.equal(publicOrigin(origin), origin);
});
