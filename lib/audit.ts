import { prisma } from "./db";

type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "PAYMENT"
  | "ADJUSTMENT"
  | "DELIVERY_REPORT"
  | "LOGIN";

type AuditEntity =
  | "User"
  | "Order"
  | "Invoice"
  | "OrderItem"
  | "DeliveryReport"
  | "InvoiceAdjustment";

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
