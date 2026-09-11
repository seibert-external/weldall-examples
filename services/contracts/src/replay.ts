import { createHash } from "node:crypto";
import type { ReplayStore } from "@weldall/sdk";

export interface RedisCommands {
  set(
    key: string,
    value: string,
    options: { NX: true; PXAT: number },
  ): Promise<string | null>;
}

export function replayStore(redis: RedisCommands): ReplayStore {
  return {
    async consume(key, expiresAt) {
      const expiry = expiresAt.getTime();
      if (!key || !Number.isSafeInteger(expiry) || expiry <= Date.now())
        return false;
      const digest = createHash("sha256").update(key).digest("hex");
      return (
        (await redis.set(`contracts:replay:${digest}`, "1", {
          NX: true,
          PXAT: expiry,
        })) === "OK"
      );
    },
  };
}
