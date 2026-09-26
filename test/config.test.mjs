import assert from "node:assert/strict";
import { createDecipheriv } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { writeEnv } from "../scripts/generate-env.mjs";
import { DEMO_SCOPES, encryptProviderToken } from "../bootstrap/seed.mjs";

async function withEnv(run, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), "weldall-demo-test-"));
  try {
    const path = join(dir, ".env");
    await writeEnv(path, options);
    await run(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("secret generation uses unique keys, safe mode, and refuses overwrite", async () =>
  withEnv(async (path) => {
    const content = await readFile(path, "utf8");
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    await assert.rejects(writeEnv(path), { code: "EEXIST" });
    assert.equal(await readFile(path, "utf8"), content);
    const privateKeys = [...content.matchAll(/_PRIVATE_JWK='(.+)'/g)].map((x) =>
      JSON.parse(x[1]),
    );
    assert.equal(new Set(privateKeys.map((x) => x.d)).size, 3);
    assert.equal(
      privateKeys.every((x) => x.crv === "P-256"),
      true,
    );
    assert.equal(/^\w+=$/m.test(content), false);
    const env = parseEnv(content);
    // Upstream accepts only base64url from at least 32 random bytes (43-128 chars).
    assert.match(env.WELDALL_SETUP_TOKEN, /^[A-Za-z0-9_-]{43,128}$/);
    assert.equal(env.WELDALL_SETUP_TOKEN.includes("="), false);
    assert.equal(Buffer.from(env.WELDALL_CREDENTIAL_ENCRYPTION_KEY, "base64").length, 32);
    assert.equal(Buffer.from(env.WELDALL_CONNECTOR_KEK, "base64").length, 32);
    assert.notEqual(env.WELDALL_CONNECTOR_KEK, env.WELDALL_CREDENTIAL_ENCRYPTION_KEY);
  }));

test("Compose pins Weldall 0.2.0 and drops removed login variables", async () => {
  const compose = await readFile(new URL("../compose.yaml", import.meta.url), "utf8");
  assert.match(
    compose,
    /&weldall-source https:\/\/github\.com\/seibert-external\/weldall\.git#[0-9a-f]{40}$/m,
  );
  for (const removed of [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "WELDALL_BOOTSTRAP_ADMIN_EMAIL",
    "OAUTH_PROXY_SECRET",
    "ENABLE_DEV_LOGIN",
  ])
    assert.equal(compose.includes(removed), false, `${removed} must not be configured`);
  // Weldall's entrypoint requires the encryption key; /setup additionally needs the token.
  assert.ok(compose.includes("WELDALL_SETUP_TOKEN: ${WELDALL_SETUP_TOKEN:?Required}"));
  assert.ok(compose.includes("WELDALL_CREDENTIAL_ENCRYPTION_KEY: ${WELDALL_CREDENTIAL_ENCRYPTION_KEY:?Required}"));
  assert.ok(compose.includes("WELDALL_CONNECTOR_KEK: ${WELDALL_CONNECTOR_KEK:?Required}"));
});

test("Compose validates with generated non-live credentials and no host ports", async () =>
  withEnv(async (path) => {
    const result = spawnSync(
      "docker",
      ["compose", "--env-file", path, "config", "--quiet"],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    const compose = await readFile(
      new URL("../compose.yaml", import.meta.url),
      "utf8",
    );
    assert.equal(/^\s+ports:/m.test(compose), false);
    assert.equal(compose.includes("appendfsync always"), true);
    assert.equal(compose.includes("noeviction"), true);
  }));

test("local generator selects mock hosts, isolated Compose, CA trust and loopback ingress", async () =>
  withEnv(async (path) => {
    const env = parseEnv(await readFile(path, "utf8"));
    assert.equal(env.WELDALL_ISSUER, "https://weldall.seibert.localdev");
    assert.equal(env.CONTRACTS_ORIGIN, "https://contracts.seibert.localdev");
    assert.equal(env.CRM_ORIGIN, "https://crm.seibert.localdev");
    assert.equal(env.COMPOSE_PROJECT_NAME, "welall-cli-demo-local");
    const result = spawnSync("docker", ["compose", "--env-file", path, "config", "--format", "json"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const config = JSON.parse(result.stdout);
    assert.equal(config.name, "welall-cli-demo-local");
    assert.ok(config.services.postgres);
    assert.ok(config.services.bootstrap);
    assert.deepEqual(config.services.caddy.networks.default.aliases, [
      "weldall.seibert.localdev", "contracts.seibert.localdev", "crm.seibert.localdev",
    ]);
    assert.ok(config.services.caddy.ports.every(port => port.host_ip === "127.0.0.1"));
    assert.equal(config.services.weldall.depends_on.postgres.condition, "service_healthy");
    for (const name of ["weldall", "contracts", "crm"]) {
      const service = config.services[name];
      assert.equal(service.depends_on["local-trust"].condition, "service_completed_successfully");
      assert.ok(service.volumes.some(volume => volume.source === "local-ca" && volume.read_only));
      assert.ok(service.volumes.every(volume => volume.source !== "caddy-data"));
      assert.equal(service.ports, undefined);
    }
    assert.equal(config.services.contracts.environment.NODE_EXTRA_CA_CERTS, "/local-ca/root.crt");
    assert.equal(config.services.weldall.environment.NODE_EXTRA_CA_CERTS, "/local-ca/root.crt");
    assert.equal(config.services.crm.environment.SSL_CERT_FILE, "/local-ca/ca-bundle.crt");
    const caddy = await readFile(new URL("../Caddyfile", import.meta.url), "utf8");
    for (const origin of [env.WELDALL_ISSUER, env.CONTRACTS_ORIGIN, env.CRM_ORIGIN])
      assert.ok(caddy.includes(`${new URL(origin).hostname} {`));
  }, { local: true }));

test("--local CLI preserves existing production env and refuses local overwrite", async () => {
  const directory = await mkdtemp(join(tmpdir(), "weldall-local-cli-"));
  try {
    const production = join(directory, ".env");
    await writeFile(production, "EXISTING_SECRET=keep-me\n", { mode: 0o600 });
    const script = fileURLToPath(new URL("../scripts/generate-env.mjs", import.meta.url));
    const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: directory, encoding: "utf8" });
    assert.equal(run("--local").status, 0);
    const local = join(directory, ".env.local");
    const first = await readFile(local, "utf8");
    assert.equal((await stat(local)).mode & 0o777, 0o600);
    assert.notEqual(run("--local").status, 0);
    assert.equal(await readFile(local, "utf8"), first);
    assert.equal(await readFile(production, "utf8"), "EXISTING_SECRET=keep-me\n");
    assert.notEqual(run("--invalid").status, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("bootstrap credential format matches upstream AES-GCM envelope; group never grants admin", () => {
  assert.deepEqual(DEMO_SCOPES, [
    "weldall:login",
    "contracts:read",
    "crm:read",
  ]);
  const key = Buffer.alloc(32, 3);
  const credential = encryptProviderToken(
    "provider-1",
    "x".repeat(64),
    key.toString("base64"),
  );
  const envelope = JSON.parse(credential.encryptedToken);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(envelope.nonce, "base64url"),
  );
  decipher.setAAD(Buffer.from("group-provider-token\0provider-1\x001"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
  assert.equal(
    Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
      decipher.final(),
    ]).toString(),
    "x".repeat(64),
  );
  assert.equal(envelope.keyVersion, credential.encryptionKeyVersion);
  assert.throws(() =>
    encryptProviderToken("id", "short", key.toString("base64")),
  );
});
