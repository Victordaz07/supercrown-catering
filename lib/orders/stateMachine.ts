import { FEATURE_FLAGS } from "@/lib/config/featureFlags";
import { logTransitionAttempt } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type { OrderStatus, Prisma } from "@prisma/client";

type PreconditionKey =
  | "DELIVERY_REPORT_EXISTS"
  | "ALL_REPORT_ITEMS_REVIEWED"
  | "HAS_DISCREPANCY"
  | "ADJUSTMENT_APPROVED"
  | "INVOICE_PAID";

type TransitionRule = {
  to: OrderStatus[];
  requiredRoles: string[];
  requiresApproval: boolean;
  requiresReason: boolean;
  preconditions?: PreconditionKey[];
  preconditionsPerTarget?: Partial<Record<OrderStatus, PreconditionKey[]>>;
};

type ExecuteTransitionOptions = {
  skipApprovalCheck?: boolean;
  tx?: Prisma.TransactionClient;
  source?: string;
};

const TRANSITIONS: Record<string, TransitionRule> = {
  PENDING: {
    to: ["QUOTE_PENDING", "CONFIRMED", "CANCELLED"],
    requiredRoles: ["SALES", "ADMIN", "MASTER"],
    requiresApproval: false,
    requiresReason: false,
  },
  QUOTE_PENDING: {
    to: ["CONFIRMED", "CANCELLED"],
    requiredRoles: ["ADMIN", "MASTER"],
    requiresApproval: true,
    requiresReason: false,
  },
  CONFIRMED: {
    to: ["IN_PREPARATION", "CANCELLED"],
    requiredRoles: ["ADMIN", "MASTER"],
    requiresApproval: false,
    requiresReason: false,
  },
  IN_PREPARATION: {
    to: ["READY_FOR_PICKUP", "CANCELLED"],
    requiredRoles: ["ADMIN", "MASTER"],
    requiresApproval: false,
    requiresReason: false,
  },
  READY: {
    to: ["READY_FOR_PICKUP", "IN_TRANSIT"],
    requiredRoles: ["ADMIN", "MASTER"],
    requiresApproval: false,
    requiresReason: false,
  },
  READY_FOR_PICKUP: {
    to: ["IN_TRANSIT"],
    requiredRoles: ["ADMIN", "MASTER", "DELIVERY"],
    requiresApproval: false,
    requiresReason: false,
  },
  IN_TRANSIT: {
    to: ["DELIVERED"],
    requiredRoles: ["DELIVERY", "ADMIN", "MASTER"],
    requiresApproval: false,
    requiresReason: false,
  },
  DELIVERED: {
    to: ["UNDER_REVIEW"],
    requiredRoles: ["ADMIN", "MASTER"],
    requiresApproval: false,
    requiresReason: true,
    preconditions: ["DELIVERY_REPORT_EXISTS"],
  },
  UNDER_REVIEW: {
    to: ["COMPLETED", "DISPUTED"],
    requiredRoles: ["ADMIN", "MASTER"],
    requiresApproval: true,
    requiresReason: true,
    preconditions: ["ALL_REPORT_ITEMS_REVIEWED"],
    preconditionsPerTarget: { DISPUTED: ["HAS_DISCREPANCY"] },
  },
  DISPUTED: {
    to: ["COMPLETED"],
    requiredRoles: ["ADMIN", "MASTER"],
    requiresApproval: true,
    requiresReason: true,
    preconditions: ["ADJUSTMENT_APPROVED", "INVOICE_PAID"],
  },
  COMPLETED: {
    to: [],
    requiredRoles: [],
    requiresApproval: false,
    requiresReason: false,
  },
  CANCELLED: {
    to: [],
    requiredRoles: [],
    requiresApproval: false,
    requiresReason: false,
  },
};

function toOrderStatus(value: string): OrderStatus | null {
  return value in TRANSITIONS ? (value as OrderStatus) : null;
}

export function canTransition(
  from: string,
  to: string,
  userRole: string,
): { allowed: boolean; reason?: string } {
  const rule = TRANSITIONS[from];
  if (!rule) {
    return { allowed: false, reason: "Estado origen no reconocido" };
  }

  const toStatus = toOrderStatus(to);
  if (!toStatus || !rule.to.includes(toStatus)) {
    return { allowed: false, reason: `Transicion ${from}->${to} no permitida` };
  }

  if (!rule.requiredRoles.includes(userRole)) {
    return { allowed: false, reason: `Rol ${userRole} no puede ejecutar esta transicion` };
  }

  return { allowed: true };
}

async function checkPreconditions(
  orderId: string,
  keys: PreconditionKey[],
): Promise<{ passed: boolean; failed: string[] }> {
  const failed: string[] = [];

  for (const key of keys) {
    if (key === "DELIVERY_REPORT_EXISTS") {
      const report = await prisma.deliveryReport.findFirst({ where: { orderId } });
      if (!report) failed.push(key);
      continue;
    }

    if (key === "ALL_REPORT_ITEMS_REVIEWED") {
      const pendingReport = await prisma.deliveryReport.findFirst({
        where: {
          orderId,
          status: "PENDING_REVIEW",
        },
      });
      if (pendingReport) failed.push(key);
      continue;
    }

    if (key === "ADJUSTMENT_APPROVED") {
      const approvedAdj = await prisma.adjustmentRequest.findFirst({
        where: {
          orderId,
          status: { in: ["APPROVED", "APPLIED"] },
        },
      });
      if (!approvedAdj) failed.push(key);
      continue;
    }

    if (key === "HAS_DISCREPANCY") {
      const report = await prisma.deliveryReport.findFirst({
        where: { orderId },
        include: { items: true },
      });
      const hasDisc =
        report?.items.some(
          (item) => item.deliveredQty !== item.expectedQty || !!item.issue,
        ) ?? false;
      if (!hasDisc) failed.push(key);
      continue;
    }

    if (key === "INVOICE_PAID") {
      const invoice = await prisma.invoice.findFirst({
        where: {
          orderId,
          status: "PAID",
        },
      });
      if (!invoice) {
        failed.push(key);
        continue;
      }
      continue;
    }
  }

  return { passed: failed.length === 0, failed };
}

export async function executeTransition(
  orderId: string,
  to: string,
  userId: string,
  userRole: string,
  reason?: string,
  options?: ExecuteTransitionOptions,
): Promise<{
  success: boolean;
  order?: unknown;
  approvalRequired?: boolean;
  approvalRequestId?: string;
  error?: string;
  blockers?: string[];
}> {
  const source = options?.source ?? "stateMachine.executeTransition";
  const db = options?.tx ?? prisma;
  const toStatus = toOrderStatus(to);
  if (!toStatus) {
    return { success: false, error: `Estado destino no reconocido: ${to}` };
  }

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { success: false, error: "Orden no encontrada" };
  }

  const validation = canTransition(order.status, toStatus, userRole);
  if (!validation.allowed) {
    await logTransitionAttempt({
      orderId,
      oldStatus: order.status,
      newStatus: toStatus,
      userId,
      reason,
      engine: "v2_state_machine",
      source,
      featureFlagState: FEATURE_FLAGS,
      metadata: { denied: true, userRole, message: validation.reason ?? "" },
    });
    return { success: false, error: validation.reason ?? "Transicion no permitida" };
  }

  const rule = TRANSITIONS[order.status];
  if (rule.requiresReason && !reason?.trim()) {
    return { success: false, error: `La transicion ${order.status}->${toStatus} requiere una razon` };
  }

  const basePreconditions = rule.preconditions ?? [];
  const extraForTarget = rule.preconditionsPerTarget?.[toStatus] ?? [];
  const allPreconditions = [
    ...basePreconditions,
    ...extraForTarget.filter((k) => !basePreconditions.includes(k)),
  ];
  const preconditionResult = await checkPreconditions(orderId, allPreconditions);
  if (!preconditionResult.passed) {
    return {
      success: false,
      error: "Precondiciones no cumplidas",
      blockers: preconditionResult.failed,
    };
  }

  if (rule.requiresApproval && !options?.skipApprovalCheck) {
    const existing = await db.orderStatusRequest.findFirst({
      where: {
        orderId,
        requestedStatus: toStatus,
        status: "PENDING",
      },
      select: { id: true },
    });
    if (existing) {
      return { success: true, approvalRequired: true, approvalRequestId: existing.id };
    }

    const created = await db.orderStatusRequest.create({
      data: {
        orderId,
        currentStatus: order.status,
        requestedStatus: toStatus,
        reason: reason?.trim() || null,
        requestedById: userId,
        status: "PENDING",
      },
      select: { id: true },
    });
    return { success: true, approvalRequired: true, approvalRequestId: created.id };
  }

  const updatedOrder = await db.order.update({
    where: { id: orderId },
    data: { status: toStatus },
  });

  await db.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus: order.status,
      toStatus,
      changedBy: userId,
      reason: reason?.trim() || null,
      engine: "v2_state_machine",
      type: "TRANSITION",
    },
  });

  // Auto-lock de precios al confirmar.
  if (toStatus === "CONFIRMED" && !order.pricingLockedAt) {
    const { lockOrderPricing } = await import("../pricing/lockPrice");
    const lockResult = await lockOrderPricing(orderId, userId);
    if (!lockResult.success) {
      // Non-blocking by design: do not fail business transition if lock fails.
      console.warn(`[PriceLock] Fallo lock en orden ${orderId}:`, lockResult.error);
    }
  }

  // Notificaciones automáticas — non-blocking.
  // DELIVERED y CANCELLED excluidos: confirm-delivery y reject-quote ya envían emails legacy.
  const ORDER_NOTIFICATION_MAP: Partial<
    Record<string, import("../email/notificationService").NotificationEventType>
  > = {
    CONFIRMED: "orderConfirmed",
    IN_PREPARATION: "orderInPreparation",
    IN_TRANSIT: "orderInTransit",
    COMPLETED: "orderCompleted",
    DISPUTED: "orderDisputed",
  };
  const notifEvent = ORDER_NOTIFICATION_MAP[toStatus];
  if (notifEvent) {
    const { sendOrderNotification } = await import("../email/notificationService");
    sendOrderNotification(orderId, notifEvent, { userRole }).catch((err) =>
      console.error("[Notification] Error en", notifEvent, ":", err),
    );
  }

  await logTransitionAttempt({
    orderId,
    oldStatus: order.status,
    newStatus: toStatus,
    userId,
    reason,
    engine: "v2_state_machine",
    source,
    featureFlagState: FEATURE_FLAGS,
    metadata: { userRole },
  });

  return { success: true, order: updatedOrder };
}

export async function rollbackTransition(
  orderId: string,
  userId: string,
  userRole: string,
  reason: string,
): Promise<{ success: boolean; order?: unknown; error?: string }> {
  if (userRole !== "MASTER") {
    return { success: false, error: "Solo MASTER puede hacer rollback" };
  }
  if (!reason?.trim()) {
    return { success: false, error: "Razon obligatoria para rollback" };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { success: false, error: "Orden no encontrada" };
  }

  const lastHistory = await prisma.orderStatusHistory.findFirst({
    where: { orderId },
    orderBy: { changedAt: "desc" },
  });

  if (!lastHistory) {
    return { success: false, error: "No hay historial de transiciones" };
  }
  if (lastHistory.toStatus !== order.status) {
    return { success: false, error: "No se puede determinar rollback seguro de un solo paso" };
  }

  const previousStatus = toOrderStatus(lastHistory.fromStatus);
  if (!previousStatus) {
    return { success: false, error: `Estado anterior invalido: ${lastHistory.fromStatus}` };
  }

  const rolledBackOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: previousStatus },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: previousStatus,
        changedBy: userId,
        reason: reason.trim(),
        engine: "v2_state_machine",
        type: "ROLLBACK",
      },
    });

    return updated;
  });

  await logTransitionAttempt({
    orderId,
    oldStatus: order.status,
    newStatus: previousStatus,
    userId,
    reason: reason.trim(),
    engine: "v2_state_machine",
    source: "stateMachine.rollbackTransition",
    featureFlagState: FEATURE_FLAGS,
    metadata: { userRole, type: "ROLLBACK" },
  });

  return { success: true, order: rolledBackOrder };
}

export { TRANSITIONS };
