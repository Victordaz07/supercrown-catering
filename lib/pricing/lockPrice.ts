import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export interface PriceSnapshotItem {
  orderItemId: string;
  itemId: string;
  name: string;
  category: string;
  quantity: number;
  unitPriceAtOrder: number;
  subtotal: number;
  appliedTierId?: string;
  discountAmount?: number;
}

export interface PriceSnapshot {
  items: PriceSnapshotItem[];
  subtotal: number;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: "USD";
  snapshotVersion: "1.0";
  lockedAt: string;
}

export async function lockOrderPricing(
  orderId: string,
  userId: string,
  tx?: Prisma.TransactionClient,
): Promise<{ success: boolean; snapshot?: PriceSnapshot; error?: string }> {
  const db = tx ?? prisma;
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    return { success: false, error: "Orden no encontrada" };
  }

  // Idempotent behavior: if already locked, return existing snapshot.
  if (order.pricingLockedAt) {
    return {
      success: true,
      snapshot: order.priceSnapshot as unknown as PriceSnapshot,
    };
  }

  if (order.items.length === 0) {
    return { success: false, error: "La orden no tiene items" };
  }

  const snapshotItems: PriceSnapshotItem[] = order.items.map((item) => ({
    orderItemId: item.id,
    itemId: item.itemId,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unitPriceAtOrder: item.unitPrice,
    subtotal: item.quantity * item.unitPrice,
  }));

  const subtotal = snapshotItems.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = order.discountAmount ?? 0;
  const taxRate = Number.parseFloat(process.env.TAX_RATE ?? "0");
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * taxRate;
  const total = taxableAmount + taxAmount;

  const snapshot: PriceSnapshot = {
    items: snapshotItems,
    subtotal,
    discountType: order.discountType ?? undefined,
    discountValue: order.discountValue ?? undefined,
    discountAmount: discountAmount > 0 ? discountAmount : undefined,
    taxRate,
    taxAmount,
    total,
    currency: "USD",
    snapshotVersion: "1.0",
    lockedAt: new Date().toISOString(),
  };

  await db.order.update({
    where: { id: orderId },
    data: {
      priceSnapshot: snapshot as object,
      pricingLockedAt: new Date(),
      pricingLockedBy: userId,
    },
  });

  try {
    await logAudit({
      userId,
      action: "PRICE_LOCKED",
      entity: "Order",
      entityId: orderId,
      metadata: { total: snapshot.total, itemCount: snapshot.items.length },
    });
  } catch (err) {
    console.error("[PriceLock] logAudit failed:", err);
  }

  return { success: true, snapshot };
}

export function getPricingDisplay(order: {
  priceSnapshot: unknown;
  pricingLockedAt: Date | null;
}): PriceSnapshot | null {
  if (!order.pricingLockedAt || !order.priceSnapshot) return null;
  return order.priceSnapshot as PriceSnapshot;
}
