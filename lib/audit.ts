import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "PAYMENT"
  | "ADJUSTMENT";

export interface LogAuditParams {
  entity: string;
  entityId: string;
  action: AuditAction;
  userId: string;
  userEmail?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  field?: string;
}

/**
 * Logs an audit entry to Firestore. Use for tracking changes to Orders, OrderItems, etc.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  const {
    entity,
    entityId,
    action,
    userId,
    userEmail,
    oldValue,
    newValue,
    field,
  } = params;

  await adminDb.collection("auditLogs").add({
    entityType: entity,
    entityId,
    action,
    userId,
    userEmail: userEmail ?? null,
    oldValue: oldValue !== undefined ? JSON.stringify(oldValue) : null,
    newValue: newValue !== undefined ? JSON.stringify(newValue) : null,
    field: field ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
}
