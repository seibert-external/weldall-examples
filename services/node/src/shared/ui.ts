import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { AuthContext } from "@weldall/sdk";
import type { NativeMcpProvider } from "@weldall/sdk/mcp";
import { createMcpAppResource, escapeMcpAppText } from "@weldall/sdk/mcp/server";
import type { Hono } from "hono";

// Browser assets live in services/node/view and are served as public,
// non-sensitive files. Caller data only reaches a view through tool results.
// The package root is two levels up from src/ and three from dist/src/.
const viewDir = ["../../view/", "../../../view/"]
  .map((path) => new URL(path, import.meta.url))
  .find((url) => existsSync(new URL("kit.js", url)))!;
const viewFile = (name: string) => readFileSync(new URL(name, viewDir), "utf8");
const browserSdk = readFileSync(
  new URL(import.meta.resolve("@weldall/sdk/mcp/browser")),
  "utf8",
);

const TYPES: Record<string, string> = {
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  svg: "image/svg+xml",
};

/**
 * One view per service: kit.js/kit.css are shared, `<name>.js/.css` are the view.
 * A content hash in every URL keeps hosts from mixing old and new assets.
 */
export function viewAssets(origin: string, name: string) {
  const load = () => {
    const files: Record<string, string> = {
      "sdk.js": browserSdk,
      "kit.js": viewFile("kit.js"),
      "kit.css": viewFile("kit.css"),
      "brand.svg": viewFile("brand.svg"),
      [`${name}.js`]: viewFile(`${name}.js`),
      [`${name}.css`]: viewFile(`${name}.css`),
    };
    const version = createHash("sha256").update(JSON.stringify(files)).digest("hex").slice(0, 16);
    return { files, version };
  };
  // Development re-reads the files, so the devhost's hot reload sees edits.
  const loaded = load();
  const current = () => (process.env.NODE_ENV === "development" ? load() : loaded);
  const url = (file: string) => `${origin}/mcp-ui/${file}?v=${current().version}`;
  return {
    url,
    register(app: Hono<any>) {
      for (const file of Object.keys(loaded.files))
        app.get(`/mcp-ui/${file}`, (c) =>
          c.body(current().files[file]!, 200, {
            "content-type": TYPES[file.split(".").at(-1)!]!,
            // The view iframe has an opaque origin; module scripts need CORS.
            "access-control-allow-origin": "*",
            "cache-control": process.env.NODE_ENV === "development" ? "no-store" : "public, max-age=300",
          }),
        );
    },
    view(options: {
      title: string;
      scopes: string[];
      allowedTools: string[];
      fallback: string;
    }) {
      return createMcpAppResource({
        name,
        scopes: options.scopes,
        resourceOrigin: origin,
        displayModes: ["inline", "fullscreen"],
        allowedTools: options.allowedTools,
        scriptUrls: [url(`${name}.js`)],
        styleUrls: [url("kit.css"), url(`${name}.css`)],
        // A static shell: data arrives with the tool result, so the HTML never
        // carries records and reads sensibly without JavaScript.
        render: () =>
          `<main id="app" data-view="${escapeMcpAppText(name)}">` +
          `<header class="bar"><img class="brand" src="${url("brand.svg")}" alt="" width="22" height="22">` +
          `<span class="bar-name">Brakenstedt</span>` +
          `<span class="bar-title">${escapeMcpAppText(options.title)}</span></header>` +
          `<p class="shell-note">${escapeMcpAppText(options.fallback)}</p></main>`,
      });
    },
  };
}

/**
 * Development-only MCP entry for the Weldall App Devhost: same provider, a
 * synthetic identity with every scope. 404 unless NODE_ENV=development and
 * WELDALL_DEV_MCP=1, so a deployment never exposes it.
 */
export function registerDevMcp(app: Hono<any>, provider: NativeMcpProvider, env = process.env) {
  const enabled = env.NODE_ENV === "development" && env.WELDALL_DEV_MCP === "1";
  app.post("/dev/mcp", (c) => {
    if (!enabled) return c.body(null, 404);
    const email = "jana.hartwig@brakenstedt.example";
    const auth = {
      identityType: "user",
      identity: { type: "user", subject: `dev:${email}`, email, emailVerified: true },
      subject: `dev:${email}`,
      email,
      emailVerified: true,
      clientId: "weldall-app-devhost",
      scopes: [...new Set([...provider.discoveryScopes, ...provider.operationScopes])],
      tokenId: "dev",
    } as unknown as AuthContext;
    return provider.handle(c.req.raw, auth);
  });
}

/**
 * Text and structured data for one tool result. The JSON round trip drops
 * undefined values and shared references, which MCP results reject.
 */
export const toolResult = (text: string, structuredContent: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text }],
  structuredContent: JSON.parse(JSON.stringify(structuredContent)) as Record<string, unknown>,
});

export const toolError = (text: string) => ({
  isError: true,
  content: [{ type: "text" as const, text }],
});
