export function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function publicOrigin(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.origin !== value ||
    url.username ||
    url.password
  )
    throw new Error(
      "Public origins must be HTTPS origins without a trailing slash",
    );
  return value;
}

export type ServiceConfig = ReturnType<typeof readConfig> & { allowInsecureLoopback?: boolean };

/** `prefix` is the service's env prefix, e.g. CONTRACTS for CONTRACTS_ORIGIN. */
export function readConfig(prefix: string, env: NodeJS.ProcessEnv = process.env) {
  return {
    issuer: publicOrigin(required(env, "WELDALL_ISSUER")),
    origin: publicOrigin(required(env, `${prefix}_ORIGIN`)),
    signingKey: {
      kid: required(env, `${prefix}_SIGNING_KID`),
      privateJwk: JSON.parse(required(env, `${prefix}_SIGNING_PRIVATE_JWK`)),
      publicJwk: JSON.parse(required(env, `${prefix}_SIGNING_PUBLIC_JWK`)),
    },
  };
}
