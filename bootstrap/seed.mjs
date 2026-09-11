import { createCipheriv, randomBytes } from "node:crypto";

export const DEMO_SCOPES = ["weldall:login", "contracts:read", "crm:read"];
const actor = "weldall-demo-bootstrap";

function origin(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.origin !== value ||
    url.username ||
    url.password
  )
    throw new Error(
      "Demo origins must be HTTPS origins without trailing slashes",
    );
  return value;
}

export function encryptProviderToken(id, token, encodedKey) {
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32)
    throw new Error("Credential encryption key must contain 32 bytes");
  if (!token || token.length < 32)
    throw new Error("Group provider token must contain at least 32 characters");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(`group-provider-token\0${id}\0${1}`));
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return {
    encryptedToken: JSON.stringify({
      version: 1,
      algorithm: "A256GCM",
      keyVersion: 1,
      nonce: nonce.toString("base64url"),
      ciphertext: ciphertext.toString("base64url"),
      tag: cipher.getAuthTag().toString("base64url"),
    }),
    encryptionKeyVersion: 1,
  };
}

function assertOwned(row, identity) {
  if (row && row.createdBy !== actor)
    throw new Error(`Refusing to replace non-demo object: ${identity}`);
}

export async function seedDemo(db, env) {
  const services = [
    {
      key: "contracts",
      name: "Demo Contracts API",
      origin: origin(env.CONTRACTS_ORIGIN),
      scope: "contracts:read",
    },
    {
      key: "crm",
      name: "Demo CRM API",
      origin: origin(env.CRM_ORIGIN),
      scope: "crm:read",
    },
  ];
  if (
    new Set([origin(env.WELDALL_ISSUER), ...services.map((x) => x.origin)])
      .size !== 3
  )
    throw new Error("Weldall and the two APIs require distinct public origins");
  const providerId = "weldall-demo-provider";
  const credential = encryptProviderToken(
    providerId,
    env.DEMO_GROUP_PROVIDER_TOKEN,
    env.WELDALL_CREDENTIAL_ENCRYPTION_KEY,
  );
  return db.$transaction(async (tx) => {
    // Match upstream domain/configuration.ts: admin/IaC and seed share this order.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(49350618)`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(49350617)`;
    const login = await tx.scope.findUniqueOrThrow({
      where: { key: "weldall:login" },
    });
    const scopeIds = [login.id];
    for (const service of services) {
      assertOwned(
        await tx.scope.findUnique({ where: { key: service.scope } }),
        service.scope,
      );
      const scope = await tx.scope.upsert({
        where: { key: service.scope },
        create: {
          key: service.scope,
          description: `Read fictional ${service.key} demo data`,
          createdBy: actor,
          updatedBy: actor,
        },
        update: {},
      });
      scopeIds.push(scope.id);
      const current = await tx.downstreamResource.findUnique({
        where: { key: service.key },
        include: { scopes: true, requestPrefixes: true },
      });
      assertOwned(current, service.key);
      if (current && current.resourceIdentifier !== `${service.origin}/api`)
        throw new Error(`Resource identity changed for ${service.key}; explicitly replace the resource before changing its origin`);
      const desired = {
        name: service.name,
        resourceIdentifier: `${service.origin}/api`,
        authorizationServer: service.origin,
        downstreamClientId: `weldall-cli-at-${service.key}`,
        enabled: true,
        skillDiscoveryEnabled: true,
      };
      const changed =
        current &&
        (Object.entries(desired).some(
          ([key, value]) => current[key] !== value,
        ) ||
          current.scopes.length !== 1 ||
          current.scopes[0]?.scopeId !== scope.id ||
          current.requestPrefixes.length !== 1 ||
          current.requestPrefixes[0]?.urlPrefix !== `${service.origin}/api`);
      const resource = await tx.downstreamResource.upsert({
        where: { key: service.key },
        create: {
          key: service.key,
          ...desired,
          createdBy: actor,
          updatedBy: actor,
        },
        update: changed
          ? { ...desired, version: { increment: 1 }, updatedBy: actor }
          : {},
      });
      await tx.resourceScope.deleteMany({
        where: { resourceId: resource.id, scopeId: { not: scope.id } },
      });
      await tx.resourceScope.upsert({
        where: {
          resourceId_scopeId: { resourceId: resource.id, scopeId: scope.id },
        },
        create: { resourceId: resource.id, scopeId: scope.id },
        update: {},
      });
      await tx.resourceRequestPrefix.deleteMany({
        where: {
          resourceId: resource.id,
          urlPrefix: { not: `${service.origin}/api` },
        },
      });
      const foreignPrefixes = await tx.resourceRequestPrefix.findMany({
        where: { resourceId: { not: resource.id } },
      });
      // Our fixed /api prefix overlaps /, /api and every /api/... descendant.
      // Compare path segments, not string startsWith('/api') (which matches /api2).
      const overlaps = foreignPrefixes.some(({ urlPrefix }) => {
        const url = new URL(urlPrefix);
        const path = url.pathname.replace(/\/+$/, "") || "/";
        return url.origin === service.origin &&
          (path === "/" || path === "/api" || path.startsWith("/api/"));
      });
      if (overlaps)
        throw new Error("Request prefix overlaps another resource");
      await tx.resourceRequestPrefix.upsert({
        where: { urlPrefix: `${service.origin}/api` },
        create: {
          resourceId: resource.id,
          urlPrefix: `${service.origin}/api`,
          createdBy: actor,
        },
        update: {},
      });
      // refreshDueCatalogs only sweeps existing rows, including on first deploy.
      await tx.discoveredSkillCatalog.upsert({
        where: { resourceId: resource.id },
        create: { resourceId: resource.id, nextRefreshAt: new Date(0) },
        update: { nextRefreshAt: new Date(0) },
      });
    }
    assertOwned(
      await tx.groupProvider.findUnique({ where: { key: "demo-readers" } }),
      "demo-readers",
    );
    const existingProvider = await tx.groupProvider.findUnique({
      where: { id: providerId },
    });
    assertOwned(existingProvider, providerId);
    if (existingProvider && existingProvider.key !== "demo-readers")
      throw new Error("Demo provider ID conflict");
    await tx.groupProvider.upsert({
      where: { id: providerId },
      create: {
        id: providerId,
        key: "demo-readers",
        name: "Public demo readers",
        adapterType: "management-api-v1",
        baseUrl: services[1].origin,
        enabled: true,
        ...credential,
        createdBy: actor,
        updatedBy: actor,
      },
      update: {
        baseUrl: services[1].origin,
        enabled: true,
        ...credential,
        version: { increment: 1 },
        updatedBy: actor,
      },
    });
    const groupWhere = {
      providerId_groupId: { providerId, groupId: "demo-readers" },
    };
    const currentAssignment = await tx.groupScopeAssignment.findUnique({
      where: groupWhere,
      include: { grants: true },
    });
    assertOwned(currentAssignment, "demo-readers assignment");
    const grantsChanged = currentAssignment &&
      (currentAssignment.grants.length !== scopeIds.length ||
        currentAssignment.grants.some(({ scopeId }) => !scopeIds.includes(scopeId)));
    const assignment = await tx.groupScopeAssignment.upsert({
      where: groupWhere,
      create: {
        providerId,
        groupId: "demo-readers",
        createdBy: actor,
        updatedBy: actor,
      },
      update: grantsChanged ? { version: { increment: 1 }, updatedBy: actor } : {},
    });
    // Exactly these three scopes, never administration or IaC. No email grants touched.
    await tx.groupScopeGrant.deleteMany({
      where: { assignmentId: assignment.id, scopeId: { notIn: scopeIds } },
    });
    for (const scopeId of scopeIds)
      await tx.groupScopeGrant.upsert({
        where: {
          assignmentId_scopeId: { assignmentId: assignment.id, scopeId },
        },
        create: { assignmentId: assignment.id, scopeId, createdBy: actor },
        update: {},
      });
  });
}
