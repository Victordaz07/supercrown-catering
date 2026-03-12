export interface PriceLockViolation {
  blocked: true;
  message: string;
  lockedAt: Date;
}

export interface PriceLockClear {
  blocked: false;
}

export type PriceLockCheck = PriceLockViolation | PriceLockClear;

const PROTECTED_FIELDS = [
  "addItems",
  "removeItems",
  "updateItems",
  "discountType",
  "discountValue",
  "discountAmount",
  "couponId",
  "unitPrice",
  "itemPrices",
] as const;

export function checkPriceLock(
  order: { pricingLockedAt: Date | null; orderNumber?: string } | null,
  body: Record<string, unknown>,
): PriceLockCheck {
  if (!order?.pricingLockedAt) return { blocked: false };

  const violations = PROTECTED_FIELDS.filter((field) => body[field] !== undefined);
  if (violations.length === 0) return { blocked: false };

  const lockedDate = order.pricingLockedAt.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    blocked: true,
    lockedAt: order.pricingLockedAt,
    message:
      `Esta orden tiene precios congelados desde el ${lockedDate}. ` +
      "No se pueden modificar items, cantidades ni precios. " +
      "Para ajustes post-entrega usa el modulo de Ajustes.",
  };
}
