// Local view development with the Weldall App Devhost: every Node service on a
// loopback origin with an in-memory replay store and the dev-only MCP entry
// (POST /dev/mcp). Never used by the container image or a deployment.
//   NODE_ENV=development WELDALL_DEV_MCP=1 npx tsx src/dev.ts
import { serve } from "@hono/node-server";
import { generateEs256KeyPair, inMemory } from "@weldall/sdk";
import { createApp as contracts } from "./contracts/app.js";
import { createApp as crm } from "./crm/app.js";
import { createApp as tickets } from "./tickets/app.js";
import { createApp as wiki } from "./wiki/app.js";

if (process.env.NODE_ENV !== "development" || process.env.WELDALL_DEV_MCP !== "1")
  throw new Error("Set NODE_ENV=development and WELDALL_DEV_MCP=1");

const services = { contracts: [contracts, 4101], crm: [crm, 4102], tickets: [tickets, 4103], wiki: [wiki, 4104] } as const;
for (const [name, [create, port]] of Object.entries(services)) {
  const origin = `http://localhost:${port}`;
  const key = await generateEs256KeyPair();
  const app = create(
    { issuer: "http://localhost:4100", origin, signingKey: { kid: `${name}-dev`, ...key }, allowInsecureLoopback: true },
    inMemory({ suppressWarning: true }),
    async () => "PONG",
  );
  serve({ fetch: app.fetch, hostname: "127.0.0.1", port });
  console.log(`${name}: ${origin}/dev/mcp`);
}
