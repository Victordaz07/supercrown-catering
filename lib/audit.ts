import { prisma } from "./db";
import { adminDb } from "./firebase/admin";

type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "PAYMENT"
  | "PAYMENT_INTENT_CREATED"
  | "INVOICE_PAID_STRIPE"
  | "ORDER_AUTO_CLOSED"
  | "ADJUSTMENT"
  | "ADJUSTMENT_REQUESTED"
  | "ADJUSTMENT_APPROVED"
  | "ADJUSTMENT_REJECTED"
  | "ADJUSTMENT_APPLIED"
  | "DELIVERY_REPORT"
  | "LOGIN"
  | "QUOTE_SENT"
  | "QUOTE_APPROVED"
  | "QUOTE_REJECTED"
  | "QUOTE_CHANGES_PROPOSED"
  | "QUOTE_CONVERTED"
  | "QUOTE_EXPIRED"
  | "QUOTE_NEW_REVISION"
  | "PRICE_LOCKED";

type AuditEntity =
  | "User"
  | "Order"
  | "Invoice"
  | "OrderItem"
  | "DeliveryReport"
  | "InvoiceAdjustment"
  | "OrderStatusRequest"
  | "Quote"
  | "AdjustmentRequest";

interface AuditParams {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  field?: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown>;
}

type TransitionEngine = "v1_legacy" | "v2_state_machine";

interface TransitionAttemptParams {
  orderId: string;
  oldStatus: string | null;
  newStatus: string;
  userId: string;
  reason?: string;
  source: string;
  engine: TransitionEngine;
  featureFlagState: Record<string, boolean>;
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        field: params.field ?? null,
        oldValue: params.oldValue ?? null,
        newValue: params.newValue ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write:", err);
  }
}

export async function logAuditBatch(entries: AuditParams[]): Promise<void> {
  try {
    await prisma.auditLog.createMany({
      data: entries.map((p) => ({
        userId: p.userId,
        action: p.action,
        entity: p.entity,
        entityId: p.entityId,
        field: p.field ?? null,
        oldValue: p.oldValue ?? null,
        newValue: p.newValue ?? null,
        metadata: p.metadata ? JSON.stringify(p.metadata) : null,
      })),
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write batch:", err);
  }
}

export async function logTransitionAttempt(params: TransitionAttemptParams): Promise<void> {
  const payload = {
    orderId: params.orderId,
    oldStatus: params.oldStatus,
    newStatus: params.newStatus,
    userId: params.userId,
    reason: params.reason ?? null,
    source: params.source,
    engine: params.engine,
    featureFlagState: params.featureFlagState,
    timestamp: new Date().toISOString(),
    ...(params.metadata ? { metadata: params.metadata } : {}),
  };

  // Keep compatibility with existing immutable audit table.
  await logAudit({
    userId: params.userId,
    action: "STATUS_CHANGE",
    entity: "Order",
    entityId: params.orderId,
    field: "transitionAttempt",
    oldValue: params.oldStatus,
    newValue: params.newStatus,
    metadata: payload,
  });

  // Additive Firestore trail required for migration observability.
  try {
    await adminDb.collection("auditLog").add(payload);
  } catch (err) {
    console.error("[AuditLog] Failed to write transition attempt to Firestore:", err);
  }
}
