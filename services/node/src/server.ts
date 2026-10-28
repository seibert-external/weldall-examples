// One image, one service per container: `node dist/src/server.js contracts`.
import { serve } from "@hono/node-server";
import { createClient } from "redis";
import { createApp as contracts } from "./contracts/app.js";
import { createApp as crm } from "./crm/app.js";
import { readConfig, required } from "./shared/config.js";
import { replayStore } from "./shared/replay.js";
import { createApp as tickets } from "./tickets/app.js";
import { createApp as wiki } from "./wiki/app.js";

const SERVICES = {
  contracts: { create: contracts, port: 3001 },
  crm: { create: crm, port: 8000 },
  tickets: { create: tickets, port: 3003 },
  wiki: { create: wiki, port: 3004 },
} as const;

const name = process.argv[2] as keyof typeof SERVICES;
const service = SERVICES[name];
if (!service) throw new Error(`Usage: server.js ${Object.keys(SERVICES).join("|")}`);

const redis = createClient({
  url: required(process.env, "REDIS_URL"),
  disableOfflineQueue: true,
  commandOptions: { timeout: 3000 },
  socket: { connectTimeout: 3000 },
});
redis.on("error", () => console.error("Replay storage connection error"));
await redis.connect();
const app = service.create(
  readConfig(name.toUpperCase()),
  replayStore(redis, name),
  () => redis.ping(),
);
const server = serve({ fetch: app.fetch, hostname: "0.0.0.0", port: service.port });
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () =>
    server.close(() => {
      redis.destroy();
      process.exit(0);
    }),
  );
}
