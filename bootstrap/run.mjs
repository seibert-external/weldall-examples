import { PrismaClient } from "@prisma/client";
import { seedDemo } from "./seed.mjs";

const db = new PrismaClient();
try {
  await seedDemo(db, process.env);
  console.log("Demo resources and restricted public-reader group configured.");
} catch {
  // Database errors may include connection credentials or provider data.
  console.error(
    "Demo bootstrap failed. Check required configuration and object ownership in the dedicated demo database.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
