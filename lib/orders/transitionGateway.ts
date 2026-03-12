import { prisma } from "@/lib/db";
import { FEATURE_FLAGS } from "@/lib/config/featureFlags";
import { logAudit, logTransitionAttempt } from "@/lib/audit";
import { executeTransition } from "@/lib/orders/stateMachine";
import type { OrderStatus } from "@prisma/client";

type TransitionResult = {
  success: boolean;
  order?: unknown;
  approvalRequired?: boolean;
  approvalRequestId?: string;
  blockers?: string[];
  error?: string;
};

const ORDER_STATUS_VALUES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "READY",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
  "QUOTE_PENDING",
  "IN_PREPARATION",
  "READY_FOR_PICKUP",
  "UNDER_REVIEW",
  "COMPLETED",
  "DISPUTED",
];

function toOrderStatus(value: string): OrderStatus | null {
  return ORDER_STATUS_VALUES.includes(value as OrderStatus) ? (value as OrderStatus) : null;
}

export async function transitionOrderStatus(
  orderId: string,
  newStatus: string,
  userId: string,
  userRole: string,
  reason?: string,
  source = "unknown",
): Promise<TransitionResult> {
  const engine = FEATURE_FLAGS.ORDER_STATE_MACHINE_V2 ? "v2_state_machine" : "v1_legacy";

  if (FEATURE_FLAGS.ORDER_STATE_MACHINE_V2) {
    return executeTransition(orderId, newStatus, userId, userRole, reason, {
      source: `transitionGateway:${source}`,
    });
  }

  const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existingOrder) {
    await logTransitionAttempt({
      orderId,
      oldStatus: null,
      newStatus,
      userId,
      reason,
      engine,
      source,
      featureFlagState: FEATURE_FLAGS,
      metadata: { error: "Order not found", userRole },
    });

    return { success: false, error: "Order not found" };
  }

  if (existingOrder.status === newStatus) {
    await logTransitionAttempt({
      orderId,
      oldStatus: existingOrder.status,
      newStatus,
      userId,
      reason,
      engine,
      source,
      featureFlagState: FEATURE_FLAGS,
      metadata: { noop: true, userRole },
    });
    return { success: true, order: existingOrder };
  }

  const nextStatus = toOrderStatus(newStatus);
  if (!nextStatus) {
    return { success: false, error: `Invalid status: ${newStatus}` };
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: nextStatus },
  });

  await logAudit({
    userId,
    action: "STATUS_CHANGE",
    entity: "Order",
    entityId: orderId,
    field: "status",
    oldValue: existingOrder.status,
    newValue: newStatus,
    metadata: {
      source,
      reason: reason ?? null,
      userRole,
      engine,
    },
  });

  await logTransitionAttempt({
    orderId,
    oldStatus: existingOrder.status,
    newStatus,
    userId,
    reason,
    engine,
    source,
    featureFlagState: FEATURE_FLAGS,
    metadata: { userRole },
  });

  return { success: true, order: updatedOrder };
}
