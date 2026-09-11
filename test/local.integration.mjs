// Bounded production-container check; never changes hosts, system trust or existing env files.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { createDpopProof, generateEs256KeyPair, issueIdJag, JWT_DPOP_GRANT } from "@weldall/sdk";
import { writeEnv } from "../scripts/generate-env.mjs";

const cwd = fileURLToPath(new URL("../", import.meta.url));
const project = `weldall-local-test-${randomUUID().slice(0, 12)}`;
const directory = await mkdtemp(join(tmpdir(), `${project}-`));
const envFile = join(directory, ".env.local");
let environment;
const compose = ["compose", "--env-file", envFile, "--project-name", project];
function command(executable, args, options = {}) {
  const result = spawnSync(executable, args, {
    cwd, env: environment, encoding: "utf8", timeout: 900_000,
    maxBuffer: 32 * 1024 * 1024, ...options,
  });
  if (result.status !== 0) throw new Error(`${executable} ${args[0]} failed: ${result.stderr || result.error?.message}`);
  return result.stdout.trim();
}
const docker = (args, options) => command("docker", args, options);
const local = (args, options) => docker([...compose, ...args], options);
function request(url, options = {}) {
  // Execute via a real Node container with configured CA trust and Docker DNS aliases.
  // Capture tokens in memory; do not emit them in test output or command-line arguments.
  const source = `import {readFileSync} from 'node:fs';
    const {url, options} = JSON.parse(readFileSync(0, 'utf8'));
    const response = await fetch(url, {...options, signal: AbortSignal.timeout(5000)});
    console.log(JSON.stringify({status: response.status, body: await response.json()}));`;
  return JSON.parse(local(["exec", "-T", "contracts", "node", "--input-type=module", "-e", source], {
    input: JSON.stringify({ url, options }),
  }));
}
try {
  await writeEnv(envFile, { local: true });
  const values = parseEnv(await readFile(envFile, "utf8"));
  environment = { ...process.env, ...values, LOCAL_HTTP_PORT: "0", LOCAL_HTTPS_PORT: "0" };
  local(["up", "--build", "--detach"]);
  let bootstrapped = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const id = local(["ps", "--all", "--quiet", "bootstrap"]);
    const state = docker(["inspect", "--format", "{{.State.Status}}:{{.State.ExitCode}}", id]);
    if (state.startsWith("exited:")) {
      assert.equal(state, "exited:0", "local bootstrap must succeed");
      bootstrapped = true;
      break;
    }
    await delay(1000);
  }
  assert.ok(bootstrapped, "bootstrap timed out");

  const root = join(directory, "root.crt");
  local(["cp", "caddy:/data/caddy/pki/authorities/local/root.crt", root]);
  const httpsPort = local(["port", "caddy", "443"]).split(":").at(-1);
  for (const [origin, path] of [
    [values.WELDALL_ISSUER, "/.well-known/openid-configuration"],
    [values.CONTRACTS_ORIGIN, "/health"],
    [values.CRM_ORIGIN, "/health"],
  ]) {
    const host = new URL(origin).hostname;
    command("curl", ["--silent", "--show-error", "--fail", "--max-time", "10", "--cacert", root,
      "--noproxy", "*", "--resolve", `${host}:${httpsPort}:127.0.0.1`, `https://${host}:${httpsPort}${path}`]);
  }
  console.log("PASS local Caddy: three mock hosts, HTTPS certificate verification, loopback ingress and bootstrap.");

  local(["exec", "-T", "crm", "python", "-c",
    "import os,httpx; r=httpx.get(os.environ['WELDALL_ISSUER']+'/.well-known/openid-configuration'); r.raise_for_status()"]);
  local(["exec", "-T", "weldall", "node", "-e",
    "fetch('https://crm.seibert.localdev/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]);
  const group = request(`${values.CRM_ORIGIN}/api/management/groups/`, {
    headers: { authorization: `Token ${values.DEMO_GROUP_PROVIDER_TOKEN}` },
  });
  assert.equal(group.status, 200);
  assert.equal(group.body[0].ou, "demo-readers");
  console.log("PASS local trust: Python and Node trust Caddy; protected directory reachable over HTTPS.");

  for (const [service, origin, path] of [
    ["contracts", values.CONTRACTS_ORIGIN, "/api/contracts"],
    ["crm", values.CRM_ORIGIN, "/api/organizations"],
  ]) {
    assert.equal(request(`${origin}${path}`).status, 401);
    const device = await generateEs256KeyPair();
    // Test authority signs an assertion using only this disposable environment's key.
    const assertion = await issueIdJag({
      issuer: values.WELDALL_ISSUER, subject: "local-test", email: "local@example.com",
      audience: origin, resource: `${origin}/api`, clientId: `weldall-cli-at-${service}`,
      scopes: [`${service}:read`], jkt: device.jkt, kid: values.WELDALL_SIGNING_KID,
      privateJwk: JSON.parse(values.WELDALL_SIGNING_PRIVATE_JWK),
    });
    const proof = await createDpopProof({ ...device, method: "POST", url: `${origin}/oauth/token` });
    const token = request(`${origin}/oauth/token`, {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", dpop: proof },
      body: new URLSearchParams({ grant_type: JWT_DPOP_GRANT, assertion }).toString(),
    });
    assert.equal(token.status, 200);
    const accessToken = token.body.access_token;
    const dpop = await createDpopProof({ ...device, method: "GET", url: `${origin}${path}`, accessToken });
    const options = { headers: { authorization: `DPoP ${accessToken}`, dpop } };
    const result = request(`${origin}${path}`, options);
    assert.equal(result.status, 200);
    assert.equal(result.body.items.length, 3);
    assert.equal(request(`${origin}${path}`, options).status, 401);
    console.log(`PASS local ${service}: real issuer discovery/JWKS, ID-JAG exchange, DPoP read and replay rejection through Caddy.`);
  }
} finally {
  if (environment) {
    spawnSync("docker", [...compose, "down", "--volumes", "--remove-orphans"], { cwd, env: environment, stdio: "ignore", timeout: 120_000 });
    spawnSync("docker", ["image", "rm", ...["weldall", "contracts", "crm", "bootstrap"].map(service => `${project}-${service}`)], { stdio: "ignore", timeout: 120_000 });
  }
  await rm(directory, { recursive: true, force: true });
}
