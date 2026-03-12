import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const VALID_STATUSES = [
  "DRAFT",
  "SENT",
  "DELIVERED",
  "ADJUSTED",
  "PAID",
  "OVERDUE",
  "VOID",
  "REFUNDED",
] as const;

function hasDryRunFlag() {
  return process.argv.includes("--dry-run");
}

async function main() {
  const dryRun = hasDryRunFlag();
  console.log(`[Invoice status backfill] dryRun=${dryRun}`);

  const rows = await prisma.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"::text AS "status"
    FROM "Invoice"
  `;

  let valid = 0;
  let fallback = 0;
  for (const row of rows) {
    if (VALID_STATUSES.includes(row.status as (typeof VALID_STATUSES)[number])) {
      valid += 1;
      continue;
    }
    fallback += 1;
    console.warn(
      `[Invoice status backfill] Unknown status for invoice ${row.id}: ${row.status} -> DRAFT`,
    );
    if (!dryRun) {
      await prisma.$executeRaw`
        UPDATE "Invoice"
        SET "status" = 'DRAFT'
        WHERE "id" = ${row.id}
      `;
    }
  }

  console.log("[Invoice status backfill] Reporte final");
  console.log(`- Total facturas inspeccionadas: ${rows.length}`);
  console.log(`- Status validos (sin cambio): ${valid}`);
  console.log(`- Status con fallback a DRAFT: ${fallback}`);
}

main()
  .catch((err) => {
    console.error("Error in backfill-invoice-statuses:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
