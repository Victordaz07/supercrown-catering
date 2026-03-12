import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const VALID_STATUSES = [
  "REQUESTED",
  "PRICING",
  "SENT",
  "CLIENT_PROPOSED_CHANGES",
  "CLIENT_APPROVED",
  "CLIENT_REJECTED",
  "CONVERTED",
  "EXPIRED",
] as const;

function hasDryRunFlag() {
  return process.argv.includes("--dry-run");
}

async function main() {
  const dryRun = hasDryRunFlag();
  console.log(`[Quote status backfill] dryRun=${dryRun}`);

  const rows = await prisma.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"::text AS "status"
    FROM "Quote"
  `;

  let valid = 0;
  let fallback = 0;
  for (const row of rows) {
    if (VALID_STATUSES.includes(row.status as (typeof VALID_STATUSES)[number])) {
      valid += 1;
      continue;
    }
    fallback += 1;
    console.warn(`[Quote status backfill] Unknown status for quote ${row.id}: ${row.status} -> REQUESTED`);
    if (!dryRun) {
      await prisma.$executeRaw`
        UPDATE "Quote"
        SET "status" = 'REQUESTED'
        WHERE "id" = ${row.id}
      `;
    }
  }

  console.log("[Quote status backfill] Reporte final");
  console.log(`- Total quotes inspeccionadas: ${rows.length}`);
  console.log(`- Status validos (sin cambio): ${valid}`);
  console.log(`- Status con fallback a REQUESTED: ${fallback}`);
}

main()
  .catch((err) => {
    console.error("Error in backfill-quote-statuses:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
