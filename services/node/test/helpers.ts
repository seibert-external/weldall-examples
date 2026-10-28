import { createDpopProof, generateEs256KeyPair, inMemory, issueAccessToken, type ReplayStore } from "@weldall/sdk";
import type { ServiceConfig } from "../src/shared/config.js";

export const NOW = new Date("2026-10-28T10:00:00+01:00");

type Create = (
  config: ServiceConfig,
  replay: ReplayStore,
  ping: () => Promise<unknown>,
  now?: () => Date,
) => { fetch(request: Request): Response | Promise<Response> };

/** A service with real SDK verification; requests carry fresh DPoP proofs. */
export async function fixture(create: Create, key: string, now = NOW) {
  const origin = `https://${key}.weldall.example.com`;
  const signing = await generateEs256KeyPair();
  const device = await generateEs256KeyPair();
  const app = create(
    { issuer: "https://weldall.example.com", origin, signingKey: { kid: "test", ...signing } },
    inMemory({ suppressWarning: true }),
    async () => "PONG",
    () => now,
  );
  const request = async (path: string, init: { method?: string; scopes?: string[]; proofOrigin?: string; body?: unknown } = {}) => {
    const method = init.method ?? "GET";
    const accessToken = await issueAccessToken({
      issuer: origin,
      subject: "user-1",
      email: "visitor@example.com",
      resource: `${origin}/api`,
      clientId: `weldall-cli-at-${key}`,
      scopes: init.scopes ?? [`${key}:read`],
      jkt: device.jkt,
      kid: "test",
      privateJwk: signing.privateJwk,
    });
    const proof = await createDpopProof({ ...device, method, url: `${init.proofOrigin ?? origin}${path}`, accessToken });
    return new Request(`http://internal${path}`, {
      method,
      headers: {
        authorization: `DPoP ${accessToken}`,
        dpop: proof,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "x-forwarded-host": "attacker.example",
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });
  };
  const get = async (path: string) => (await app.fetch(await request(path))).json();
  /** One JSON-RPC call against the authenticated native MCP endpoint. */
  const rpc = async (method: string, params: unknown) => {
    const response = await app.fetch(await request("/api/mcp", { method: "POST", body: { jsonrpc: "2.0", id: 1, method, params } }));
    return (await response.json()) as { result?: any; error?: { message: string } };
  };
  return { app, origin, request, get, rpc };
}
