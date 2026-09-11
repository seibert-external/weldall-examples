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

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    issuer: publicOrigin(required(env, "WELDALL_ISSUER")),
    origin: publicOrigin(required(env, "CONTRACTS_ORIGIN")),
    signingKey: {
      kid: required(env, "CONTRACTS_SIGNING_KID"),
      privateJwk: JSON.parse(required(env, "CONTRACTS_SIGNING_PRIVATE_JWK")),
      publicJwk: JSON.parse(required(env, "CONTRACTS_SIGNING_PUBLIC_JWK")),
    },
  };
}
