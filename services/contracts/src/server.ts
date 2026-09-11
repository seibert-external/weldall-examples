import { serve } from "@hono/node-server";
import { createClient } from "redis";
import { createApp } from "./app.js";
import { readConfig, required } from "./config.js";
import { replayStore } from "./replay.js";

const redis = createClient({
  url: required(process.env, "REDIS_URL"),
  disableOfflineQueue: true,
  commandOptions: { timeout: 3000 },
  socket: { connectTimeout: 3000 },
});
redis.on("error", () => console.error("Replay storage connection error"));
await redis.connect();
const app = createApp(readConfig(), replayStore(redis), () => redis.ping());
const server = serve({ fetch: app.fetch, hostname: "0.0.0.0", port: 3001 });
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () =>
    server.close(() => {
      redis.destroy();
      process.exit(0);
    }),
  );
}
