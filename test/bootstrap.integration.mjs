import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { seedDemo, DEMO_SCOPES } from "../bootstrap/seed.mjs";

const db = new PrismaClient();
const env = {
  WELDALL_ISSUER: "https://weldall.example.com",
  CONTRACTS_ORIGIN: "https://contracts.weldall.example.com",
  CRM_ORIGIN: "https://crm.weldall.example.com",
  DEMO_GROUP_PROVIDER_TOKEN: randomBytes(32).toString("hex"),
  WELDALL_CREDENTIAL_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
};
try {
  // This is an ephemeral schema-only database. Production creates system scopes itself.
  const login = await db.scope.create({
    data: {
      key: "weldall:login",
      description: "Login",
      isSystem: true,
      createdBy: "upstream",
      updatedBy: "upstream",
    },
  });
  const admin = await db.scope.create({
    data: {
      key: "weldall:administer",
      description: "Admin",
      isSystem: true,
      createdBy: "upstream",
      updatedBy: "upstream",
    },
  });
  const owner = await db.emailScopeAssignment.create({
    data: {
      normalizedEmail: "owner@example.com",
      createdBy: "upstream",
      updatedBy: "upstream",
      grants: {
        create: [
          { scopeId: login.id, createdBy: "upstream" },
          { scopeId: admin.id, createdBy: "upstream" },
        ],
      },
    },
  });
  await seedDemo({
    $transaction: (work) => db.$transaction(async (tx) => {
      await work(tx);
      const locks = await tx.$queryRaw`SELECT objid FROM pg_locks
        WHERE pid = pg_backend_pid() AND locktype = 'advisory' AND granted
          AND classid = 0 AND objid IN (49350618, 49350617)`;
      assert.equal(locks.length, 2, "seed must hold upstream configuration locks");
    }),
  }, env);
  const firstAssignment = await db.groupScopeAssignment.findFirstOrThrow();
  const catalogs = await db.discoveredSkillCatalog.findMany();
  assert.equal(catalogs.length, 2, "first deploy schedules both skill catalogs");
  assert.ok(catalogs.every(x => x.nextRefreshAt.getTime() <= Date.now()));
  const first = await db.downstreamResource.findMany({
    orderBy: { key: "asc" },
  });
  await seedDemo(db, env);
  const second = await db.downstreamResource.findMany({
    orderBy: { key: "asc" },
  });
  assert.deepEqual(
    second.map((x) => x.id),
    first.map((x) => x.id),
  );
  assert.deepEqual(second.map(x => x.version), first.map(x => x.version));
  assert.equal((await db.groupScopeAssignment.findFirstOrThrow()).version, firstAssignment.version);
  assert.equal(await db.discoveredSkillCatalog.count(), 2);
  assert.equal(second.length, 2);
  assert.equal(await db.scope.count(), 4);
  assert.equal(await db.groupProvider.count(), 1);
  assert.equal(await db.groupScopeAssignment.count(), 1);
  assert.equal(await db.resourceRequestPrefix.count(), 2);
  assert.equal(await db.resourceScope.count(), 2);
  const grants = await db.groupScopeGrant.findMany({
    include: { scope: true },
  });
  assert.deepEqual(
    grants.map((x) => x.scope.key).sort(),
    [...DEMO_SCOPES].sort(),
  );
  assert.equal(
    await db.emailScopeGrant.count({ where: { assignmentId: owner.id } }),
    2,
  );
  assert.equal(await db.emailScopeAssignment.count(), 1);
  const assignment = await db.groupScopeAssignment.findFirstOrThrow();
  await db.groupScopeGrant.create({
    data: {
      assignmentId: assignment.id,
      scopeId: admin.id,
      createdBy: "test-drift",
    },
  });
  await seedDemo(db, env);
  assert.equal(
    await db.groupScopeGrant.count({ where: { scopeId: admin.id } }),
    0,
  );
  const reconciled = await db.groupScopeAssignment.findFirstOrThrow();
  assert.equal(reconciled.version, assignment.version + 1);
  const staleWrite = await db.groupScopeAssignment.updateMany({
    where: { id: assignment.id, version: assignment.version },
    data: { version: { increment: 1 } },
  });
  assert.equal(staleWrite.count, 0, "stale admin versions cannot overwrite reconciliation");
  await seedDemo(db, env);
  assert.equal((await db.groupScopeAssignment.findFirstOrThrow()).version, reconciled.version);

  await assert.rejects(seedDemo(db, { ...env, CONTRACTS_ORIGIN: "https://moved.example.com" }), /Resource identity changed/);
  assert.equal((await db.downstreamResource.findUniqueOrThrow({ where: { key: "contracts" } })).resourceIdentifier, `${env.CONTRACTS_ORIGIN}/api`);

  const foreign = await db.downstreamResource.create({ data: {
    key: "foreign", name: "Unrelated resource", resourceIdentifier: "https://foreign.example.com/api",
    authorizationServer: "https://foreign.example.com", downstreamClientId: "foreign",
    createdBy: "unrelated-owner", updatedBy: "unrelated-owner",
  } });
  for (const path of ["/", "/api", "/api/", "/api/nested"]) {
    // Exact /api is already owned by the demo; move it temporarily to test the conflict.
    if (path === "/api") await db.resourceRequestPrefix.delete({ where: { urlPrefix: `${env.CONTRACTS_ORIGIN}/api` } });
    const prefix = await db.resourceRequestPrefix.create({ data: {
      resourceId: foreign.id, urlPrefix: `${env.CONTRACTS_ORIGIN}${path}`, createdBy: "unrelated-owner",
    } });
    await assert.rejects(seedDemo(db, env), /overlaps another resource/);
    assert.equal((await db.resourceRequestPrefix.findUniqueOrThrow({ where: { id: prefix.id } })).resourceId, foreign.id);
    await db.resourceRequestPrefix.delete({ where: { id: prefix.id } });
    await seedDemo(db, env);
  }
  await db.resourceRequestPrefix.create({ data: {
    resourceId: foreign.id, urlPrefix: `${env.CONTRACTS_ORIGIN}/api2`, createdBy: "unrelated-owner",
  } });
  await seedDemo(db, env); // Non-overlapping path segments remain valid.
  await db.downstreamResource.delete({ where: { id: foreign.id } });
  await db.downstreamResource.update({
    where: { key: "crm" },
    data: { createdBy: "unrelated-owner" },
  });
  await assert.rejects(seedDemo(db, env), /non-demo object/);
  assert.equal(
    await db.emailScopeGrant.count({ where: { assignmentId: owner.id } }),
    2,
  );
  console.log(
    "PASS bootstrap: catalog scheduling, configuration locks, idempotency, versioned grants, immutable audience, prefix isolation, admin untouched.",
  );
} finally {
  await db.$disconnect();
}
