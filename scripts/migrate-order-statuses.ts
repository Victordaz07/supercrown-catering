import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CHUNK_SIZE = 100;

function hasDryRunFlag(): boolean {
  return process.argv.includes("--dry-run");
}

async function main() {
  const dryRun = hasDryRunFlag();
  const beforeCounts = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  console.log("Estado actual de ordenes por status:");
  for (const row of beforeCounts) {
    console.log(`- ${row.status}: ${row._count._all}`);
  }

  const totalReady = await prisma.order.count({ where: { status: "READY" } });
  if (totalReady === 0) {
    console.log("No hay ordenes en READY. Nada que migrar.");
    return;
  }

  if (dryRun) {
    console.log(`[DRY-RUN] Ordenes READY detectadas para migrar: ${totalReady}`);
    return;
  }

  let migrated = 0;
  while (true) {
    const batch = await prisma.order.findMany({
      where: { status: "READY" },
      select: { id: true },
      take: CHUNK_SIZE,
      orderBy: { createdAt: "asc" },
    });

    if (batch.length === 0) {
      break;
    }

    const ids = batch.map((o) => o.id);
    const result = await prisma.order.updateMany({
      where: {
        id: { in: ids },
        status: "READY",
      },
      data: { status: "READY_FOR_PICKUP" },
    });

    migrated += result.count;
    console.log(`Migradas ${result.count} ordenes en este lote. Total migradas: ${migrated}`);
  }

  const unchanged = beforeCounts
    .filter((row) => row.status !== "READY")
    .reduce((acc, row) => acc + row._count._all, 0);

  console.log("Reporte final:");
  console.log(`- Ordenes migradas READY -> READY_FOR_PICKUP: ${migrated}`);
  console.log(`- Ordenes sin cambio necesario: ${unchanged}`);
}

main()
  .catch((err) => {
    console.error("Error en migrate-order-statuses:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
