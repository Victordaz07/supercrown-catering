import { PrismaClient } from "@prisma/client";
import { lockOrderPricing } from "../lib/pricing/lockPrice";

const prisma = new PrismaClient();
const CHUNK_SIZE = 50;

function hasDryRunFlag() {
  return process.argv.includes("--dry-run");
}

async function main() {
  const dryRun = hasDryRunFlag();
  const statuses = [
    "CONFIRMED",
    "IN_PREPARATION",
    "READY",
    "READY_FOR_PICKUP",
    "IN_TRANSIT",
    "DELIVERED",
    "UNDER_REVIEW",
    "COMPLETED",
  ] as const;

  console.log("[Backfill Price Lock] ONE-TIME script");
  console.log(`[Backfill Price Lock] dryRun=${dryRun}`);

  let lockedCount = 0;
  let skippedNoItemsCount = 0;
  let errorCount = 0;
  const skippedNoItems: string[] = [];
  const errorIds: string[] = [];
  let offset = 0;

  while (true) {
    const orders = await prisma.order.findMany({
      where: {
        pricingLockedAt: null,
        status: { in: [...statuses] },
      },
      select: { id: true },
      take: CHUNK_SIZE,
      skip: offset,
      orderBy: { createdAt: "asc" },
    });

    if (orders.length === 0) break;

    for (const order of orders) {
      try {
        const withItems = await prisma.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });
        if (!withItems || withItems.items.length === 0) {
          skippedNoItemsCount += 1;
          skippedNoItems.push(order.id);
          continue;
        }

        if (dryRun) {
          lockedCount += 1;
          continue;
        }

        const result = await lockOrderPricing(order.id, "system_backfill");
        if (result.success) {
          lockedCount += 1;
        } else {
          errorCount += 1;
          errorIds.push(order.id);
        }
      } catch {
        errorCount += 1;
        errorIds.push(order.id);
      }
    }

    offset += CHUNK_SIZE;
  }

  console.log("Reporte final:");
  console.log(`✅ ${lockedCount} ordenes con snapshot creado`);
  console.log(`⏭️ ${skippedNoItemsCount} ordenes sin items (skipped)`);
  console.log(`❌ ${errorCount} ordenes con error`);
  if (skippedNoItems.length > 0) {
    console.log("IDs skipped (sin items):", skippedNoItems.join(", "));
  }
  if (errorIds.length > 0) {
    console.log("IDs con error:", errorIds.join(", "));
  }
}

main()
  .catch((err) => {
    console.error("[Backfill Price Lock] Error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
