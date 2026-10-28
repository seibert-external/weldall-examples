import { createHash } from "node:crypto";
import type { ReplayStore } from "@weldall/sdk";

export interface RedisCommands {
  set(
    key: string,
    value: string,
    options: { NX: true; PXAT: number },
  ): Promise<string | null>;
}

/** `namespace` keeps the services' proofs apart in the shared Redis. */
export function replayStore(redis: RedisCommands, namespace: string): ReplayStore {
  return {
    async consume(key, expiresAt) {
      const expiry = expiresAt.getTime();
      if (!key || !Number.isSafeInteger(expiry) || expiry <= Date.now())
        return false;
      const digest = createHash("sha256").update(key).digest("hex");
      return (
        (await redis.set(`${namespace}:replay:${digest}`, "1", {
          NX: true,
          PXAT: expiry,
        })) === "OK"
      );
    },
  };
}
