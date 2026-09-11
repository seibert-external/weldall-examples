// Bounded integration harness. Only ephemeral, isolated test containers are started.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "redis";
import {
  createDpopProof,
  generateEs256KeyPair,
  issueAccessToken,
} from "@weldall/sdk";
import { writeEnv } from "./generate-env.mjs";

const id = `weldall-demo-test-${process.pid}-${randomUUID().slice(0, 8)}`;
const directory = await mkdtemp(join(tmpdir(), `${id}-`));
const containers = [];
let client;
let environment;
function docker(args, options = {}) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    env: { ...process.env, ...environment },
    ...options,
  });
  if (result.status !== 0)
    throw new Error(
      `docker ${args[0]} failed: ${result.stderr ?? "see output above"}`,
    );
  return result.stdout?.trim();
}
async function ready(name, command) {
  for (let i = 0; i < 60; i++) {
    const result = spawnSync("docker", ["exec", name, ...command], {
      stdio: "ignore",
    });
    if (result.status === 0) return;
    await delay(1000);
  }
  throw new Error(`${name} readiness timed out`);
}
function run(name, image, envNames, args = [], ports = []) {
  containers.push(name);
  docker([
    "run",
    "-d",
    "--name",
    name,
    "--network",
    id,
    ...ports.flatMap((p) => ["-p", `127.0.0.1::${p}`]),
    ...envNames.flatMap((name) => ["-e", name]),
    image,
    ...args,
  ]);
}
function port(name, inner) {
  return Number(
    docker(["port", name, String(inner)])
      .split(":")
      .at(-1),
  );
}
try {
  const envFile = join(directory, ".env");
  await writeEnv(envFile);
  environment = parseEnv(await readFile(envFile, "utf8"));
  docker(
    [
      "compose",
      "--project-name",
      id,
      "--env-file",
      envFile,
      "build",
      "weldall",
      "contracts",
      "crm",
      "bootstrap",
    ],
    { stdio: "inherit" },
  );
  const source = (await readFile("compose.yaml", "utf8")).match(
    /&weldall-source (https:\/\/\S+)/,
  )[1];
  docker(
    [
      "build",
      "--build-context",
      `weldall-source=${source}`,
      "--target",
      "integration",
      "-f",
      "bootstrap/Dockerfile",
      "-t",
      `${id}-integration`,
      ".",
    ],
    { stdio: "inherit" },
  );
  docker(["network", "create", id]);
  run(
    `${id}-postgres`,
    "postgres:16.13-bookworm",
    ["POSTGRES_PASSWORD"],
    [],
    [],
  );
  await ready(`${id}-postgres`, ["pg_isready", "-U", "postgres"]);
  environment.POSTGRES_URL = `postgresql://postgres:${environment.POSTGRES_PASSWORD}@${id}-postgres:5432/postgres`;
  docker(
    ["run", "--rm", "--network", id, "-e", "POSTGRES_URL", `${id}-integration`],
    { stdio: "inherit" },
  );

  run(
    `${id}-redis`,
    "redis:7.4.8-bookworm",
    ["REDIS_PASSWORD"],
    [
      "sh",
      "-ec",
      'exec redis-server --requirepass "$REDIS_PASSWORD" --appendonly yes --appendfsync always --maxmemory 128mb --maxmemory-policy noeviction',
    ],
    [6379],
  );
  await ready(`${id}-redis`, [
    "sh",
    "-ec",
    'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping | grep -q PONG',
  ]);
  environment.REDIS_URL = `redis://:${environment.REDIS_PASSWORD}@${id}-redis:6379/0`;
  client = createClient({
    url: `redis://:${environment.REDIS_PASSWORD}@127.0.0.1:${port(`${id}-redis`, 6379)}/0`,
    disableOfflineQueue: true,
  });
  client.on("error", () => {});
  await client.connect();
  const expiry = Date.now() + 120000;
  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      client.set("test:durable-proof", "1", { NX: true, PXAT: expiry }),
    ),
  );
  assert.equal(results.filter((x) => x === "OK").length, 1);
  await client.set("test:expires", "1", { NX: true, PX: 20 });
  await delay(30);
  assert.equal(
    await client.set("test:expires", "1", { NX: true, PX: 200 }),
    "OK",
  );
  client.destroy();
  client = undefined;
  docker(["restart", `${id}-redis`]);
  await ready(`${id}-redis`, [
    "sh",
    "-ec",
    'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping | grep -q PONG',
  ]);
  client = createClient({
    url: `redis://:${environment.REDIS_PASSWORD}@127.0.0.1:${port(`${id}-redis`, 6379)}/0`,
  });
  client.on("error", () => {});
  await client.connect();
  assert.equal(
    await client.set("test:durable-proof", "1", { NX: true, PXAT: expiry }),
    null,
  );
  console.log(
    "PASS Redis: atomic concurrency, expiry, AOF restart persistence.",
  );

  for (const [service, inner, path, publicOrigin, expected] of [
    ["contracts", 3001, "/api/contracts", environment.CONTRACTS_ORIGIN, 20],
    ["crm", 8000, "/api/organizations", environment.CRM_ORIGIN, 12],
  ]) {
    const names = [
      "WELDALL_ISSUER",
      "REDIS_URL",
      ...Object.keys(environment).filter((x) =>
        x.startsWith(`${service.toUpperCase()}_`),
      ),
      ...(service === "crm" ? ["DEMO_GROUP_PROVIDER_TOKEN"] : []),
    ];
    const user = docker([
      "image",
      "inspect",
      `${id}-${service}`,
      "--format",
      "{{.Config.User}}",
    ]);
    assert.ok(
      user && user !== "root" && user !== "0",
      `${service} must run non-root`,
    );
    run(`${id}-${service}`, `${id}-${service}`, names, [], [inner]);
    const command =
      service === "contracts"
        ? [
            "node",
            "-e",
            "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))",
          ]
        : [
            "python",
            "-c",
            "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')",
          ];
    await ready(`${id}-${service}`, command);
    const local = `http://127.0.0.1:${port(`${id}-${service}`, inner)}`;
    assert.equal((await fetch(`${local}${path}`)).status, 401);
    const device = await generateEs256KeyPair();
    const token = await issueAccessToken({
      issuer: publicOrigin,
      subject: "visitor",
      email: "visitor@example.com",
      resource: `${publicOrigin}/api`,
      clientId: `weldall-cli-at-${service}`,
      scopes: [`${service}:read`],
      jkt: device.jkt,
      kid: environment[`${service.toUpperCase()}_SIGNING_KID`],
      privateJwk: JSON.parse(
        environment[`${service.toUpperCase()}_SIGNING_PRIVATE_JWK`],
      ),
    });
    const proof = await createDpopProof({
      ...device,
      method: "GET",
      url: `${publicOrigin}${path}`,
      accessToken: token,
    });
    const headers = {
      authorization: `DPoP ${token}`,
      dpop: proof,
      "x-forwarded-host": "attacker.example",
    };
    const response = await fetch(`${local}${path}`, { headers });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).items.length, expected);
    assert.equal((await fetch(`${local}${path}`, { headers })).status, 401);
    console.log(
      `PASS ${service}: non-root production container, public-origin DPoP read, missing auth and replay denied.`,
    );
  }
  // Exercise the actual upstream entrypoint/migrations and packaged demo seed on a fresh DB.
  docker([
    "exec",
    `${id}-postgres`,
    "createdb",
    "-U",
    "postgres",
    "weldall-production",
  ]);
  environment.POSTGRES_URL = `postgresql://postgres:${environment.POSTGRES_PASSWORD}@${id}-postgres:5432/weldall-production`;
  environment.WELDALL_DEPLOYMENT_MODE = "production";
  const weldallNames = [
    "POSTGRES_URL",
    "BETTER_AUTH_SECRET",
    ...Object.keys(environment).filter((x) => x.startsWith("WELDALL_")),
  ];
  run(`${id}-weldall`, `${id}-weldall`, weldallNames, [], [3000]);
  await ready(`${id}-weldall`, [
    "node",
    "-e",
    "fetch('http://127.0.0.1:3000/.well-known/openid-configuration').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))",
  ]);
  docker(
    [
      "run",
      "--rm",
      "--network",
      id,
      ...[
        "POSTGRES_URL",
        "WELDALL_ISSUER",
        "CONTRACTS_ORIGIN",
        "CRM_ORIGIN",
        "DEMO_GROUP_PROVIDER_TOKEN",
        "WELDALL_CREDENTIAL_ENCRYPTION_KEY",
      ].flatMap((name) => ["-e", name]),
      `${id}-bootstrap`,
    ],
    { stdio: "inherit" },
  );
  console.log(
    "PASS upstream Weldall: production migrations/startup and packaged demo bootstrap on a fresh database.",
  );
  docker(["stop", `${id}-redis`]);
  for (const [service, inner] of [
    ["contracts", 3001],
    ["crm", 8000],
  ]) {
    assert.equal(
      (
        await fetch(
          `http://127.0.0.1:${port(`${id}-${service}`, inner)}/health`,
        )
      ).status,
      503,
    );
  }
  console.log(
    "PASS storage outage: both production health endpoints fail closed.",
  );
} finally {
  if (client?.isOpen) client.destroy();
  for (const name of containers.reverse())
    spawnSync("docker", ["rm", "-fv", name], { stdio: "ignore" });
  spawnSync("docker", ["network", "rm", id], { stdio: "ignore" });
  spawnSync("docker", ["image", "rm", ...["integration", "bootstrap", "weldall", "contracts", "crm"].map(service => `${id}-${service}`)], { stdio: "ignore" });
  await rm(directory, { recursive: true, force: true });
}
