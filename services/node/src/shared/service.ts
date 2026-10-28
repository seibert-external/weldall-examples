import type { PublishedSkill, ReplayStore } from "@weldall/sdk";
import { initWeldall, type WeldallVariables } from "@weldall/sdk/hono";
import type { NativeMcpProvider } from "@weldall/sdk/mcp";
import { Hono } from "hono";
import type { ServiceConfig } from "./config.js";
import { registerDevMcp } from "./ui.js";

export type Env = { Variables: WeldallVariables };

/** The parts every resource server of this deployment shares. */
export function createService(options: {
  key: string;
  name: string;
  scope: string;
  config: ServiceConfig;
  replay: ReplayStore;
  ping: () => Promise<unknown>;
  skills: PublishedSkill[];
  mcp?: NativeMcpProvider;
}) {
  const { config } = options;
  const weldall = initWeldall(config.issuer, {
    resource: `${config.origin}/api`,
    publicOrigin: config.origin,
    clientId: `weldall-cli-at-${options.key}`,
    supportedScopes: [options.scope],
    signingKey: config.signingKey,
    replayStore: options.replay,
    skills: { items: options.skills },
    ...(options.mcp ? { mcp: options.mcp } : {}),
    // Only src/dev.ts sets this, for loopback origins in local view development.
    ...(config.allowInsecureLoopback ? { allowInsecureLoopback: true } : {}),
  });
  const app = new Hono<Env>();
  weldall.registerRoutes(app);
  if (options.mcp) registerDevMcp(app, options.mcp);
  app.get("/", (c) =>
    c.json({ service: options.name, authentication: "Weldall DPoP", resource: `${config.origin}/api` }),
  );
  app.get("/health", async (c) => {
    try {
      await options.ping();
      return c.json({ status: "ok" });
    } catch {
      return c.json({ status: "unavailable" }, 503);
    }
  });
  const read = weldall.protect({ scopes: [options.scope] });
  // Bind DPoP to the configured public origin, not untrusted forwarded headers.
  // Coolify is the only ingress; internal health checks use the same handler.
  const fetch = (request: Request) => {
    const incoming = new URL(request.url);
    const canonical = new URL(config.origin);
    canonical.pathname = incoming.pathname;
    canonical.search = incoming.search;
    return app.fetch(new Request(canonical, request));
  };
  /** Write attempts get a friendly, authenticated refusal. */
  const readOnly = (path: string) =>
    app.on(["POST", "PUT", "PATCH", "DELETE"], path, read, (c) => {
      c.header("Allow", "GET, HEAD");
      return c.json(
        { error: "read_only", message: "Nur lesender Zugriff: Hier wird nichts geändert oder gelöscht.", changed: false },
        405,
      );
    });
  return { app, weldall, read, readOnly, fetch };
}

export const notFound = { error: "not_found", message: "Kein Datensatz mit dieser ID." };

export const includes = (haystack: (string | null | undefined)[], q: string | undefined) =>
  !q || haystack.join(" ").toLowerCase().includes(q.toLowerCase());
