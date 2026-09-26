import { generateKeyPairSync, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export function generateEnv(template, { local = false } = {}) {
  const origins = local ? {
    WELDALL_ISSUER: "https://weldall.seibert.localdev",
    CONTRACTS_ORIGIN: "https://contracts.seibert.localdev",
    CRM_ORIGIN: "https://crm.seibert.localdev",
  } : {};
  const values = {};
  for (const name of [
    "POSTGRES_PASSWORD",
    "REDIS_PASSWORD",
    "BETTER_AUTH_SECRET",
    "DEMO_GROUP_PROVIDER_TOKEN",
  ])
    values[name] = randomBytes(32).toString("hex");
  values.WELDALL_CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  values.WELDALL_CONNECTOR_KEK = randomBytes(32).toString("base64");
  // Upstream requires base64url from at least 32 random bytes (43-128 characters).
  values.WELDALL_SETUP_TOKEN = randomBytes(32).toString("base64url");
  for (const service of ["WELDALL", "CONTRACTS", "CRM"]) {
    const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    values[`${service}_SIGNING_KID`] = `${service.toLowerCase()}-demo-1`;
    values[`${service}_SIGNING_PRIVATE_JWK`] = JSON.stringify(
      pair.privateKey.export({ format: "jwk" }),
    );
    values[`${service}_SIGNING_PUBLIC_JWK`] = JSON.stringify(
      pair.publicKey.export({ format: "jwk" }),
    );
  }
  const content = template.replace(/^([A-Z_]+)=(.*)$/gm, (line, name, value) => {
    if (origins[name]) return `${name}=${origins[name]}`;
    return !value && values[name] ? `${name}='${values[name]}'` : line;
  });
  return local
    ? `${content}\n# Local-only Compose selection and isolated volumes; do not import into Coolify.\nCOMPOSE_PATH_SEPARATOR=:\nCOMPOSE_FILE=compose.yaml:compose.local.yaml\nCOMPOSE_PROJECT_NAME=welall-cli-demo-local\n`
    : content;
}

export async function writeEnv(destination, options = {}) {
  const template = await readFile(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );
  await writeFile(destination, generateEnv(template, options), {
    flag: "wx",
    mode: 0o600,
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--local"))
    throw new Error("Usage: npm run generate-env [-- --local]");
  const local = args[0] === "--local";
  const destination = local ? ".env.local" : ".env";
  try {
    await writeEnv(destination, { local });
    console.log(`Created ${destination} with new secrets (mode 0600). Never commit this file.`);
    console.log(local
      ? "Local HTTPS hosts configured. Run docker compose --env-file .env.local up --build after following the README host/CA setup. No OIDC provider is reachable locally, so /setup stays open; see the local-login limitation."
      : "Set the three origins before deploying, then complete /setup with the operator token and the owner's identity provider.");
  } catch (error) {
    console.error(
      error.code === "EEXIST"
        ? `Refusing to overwrite existing ${destination}.`
        : `Could not generate ${destination}.`,
    );
    process.exitCode = 1;
  }
}
