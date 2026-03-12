import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { AdjustmentType } from "@prisma/client";

function mapAdjTypeToInvoiceAdjType(type: AdjustmentType): string {
  const map: Record<AdjustmentType, string> = {
    ITEM_SHORTAGE: "CREDIT",
    ITEM_DAMAGE: "CREDIT",
    PRICE_ERROR: "DISCOUNT",
    LATE_DELIVERY: "DISCOUNT",
    OTHER: "CREDIT",
  };
  return map[type] ?? "CREDIT";
}

export async function applyAdjustmentToInvoice(
  adjustmentRequestId: string,
  appliedByUserId: string,
): Promise<{ success: boolean; invoiceAdjustmentId?: string; error?: string }> {
  const adjustment = await prisma.adjustmentRequest.findUnique({
    where: { id: adjustmentRequestId },
    include: { invoice: true },
  });

  if (!adjustment) {
    return { success: false, error: "AdjustmentRequest no encontrado" };
  }

  if (adjustment.status === "APPLIED") {
    return { success: true, invoiceAdjustmentId: adjustment.invoiceAdjustmentId ?? undefined };
  }
  if (adjustment.status !== "APPROVED") {
    return {
      success: false,
      error: "Solo ajustes aprobados pueden aplicarse",
    };
  }

  if (!adjustment.invoiceId) {
    return {
      success: false,
      error: "El ajuste no tiene factura asociada",
    };
  }

  const invoice = adjustment.invoice!;

  if (invoice.status === "PAID") {
    const invoiceAdj = await prisma.invoiceAdjustment.create({
      data: {
        invoiceId: adjustment.invoiceId,
        deliveryReportId: adjustment.deliveryReportId ?? undefined,
        type: "REFUND",
        reason: `[POST-PAGO] ${adjustment.description}`,
        amount: -adjustment.delta,
        approvedById: appliedByUserId,
      },
    });

    await prisma.adjustmentRequest.update({
      where: { id: adjustmentRequestId },
      data: {
        status: "APPLIED",
        appliedAt: new Date(),
        appliedBy: appliedByUserId,
        invoiceAdjustmentId: invoiceAdj.id,
      },
    });

    logAudit({
      userId: appliedByUserId,
      action: "ADJUSTMENT_APPLIED",
      entity: "AdjustmentRequest",
      entityId: adjustmentRequestId,
      metadata: {
        invoiceId: adjustment.invoiceId,
        delta: adjustment.delta,
        invoicePaid: true,
      },
    }).catch((err) =>
      console.error("[AuditLog] ADJUSTMENT_APPLIED failed:", err),
    );

    return { success: true, invoiceAdjustmentId: invoiceAdj.id };
  }

  const invoiceAdjId = await prisma.$transaction(async (tx) => {
    const invoiceAdj = await tx.invoiceAdjustment.create({
      data: {
        invoiceId: adjustment.invoiceId!,
        deliveryReportId: adjustment.deliveryReportId ?? undefined,
        type: mapAdjTypeToInvoiceAdjType(adjustment.type),
        reason: adjustment.description,
        adjustedItems: null,
        amount: -adjustment.delta,
        approvedById: appliedByUserId,
      },
    });

    const allAdjustments = await tx.invoiceAdjustment.findMany({
      where: { invoiceId: adjustment.invoiceId! },
    });
    const adjustmentSum = allAdjustments.reduce((s, a) => s + a.amount, 0);
    const newTotal =
      invoice.subtotal + invoice.taxAmount + adjustmentSum;

    await tx.invoice.update({
      where: { id: adjustment.invoiceId! },
      data: { total: newTotal, status: "ADJUSTED" },
    });

    await tx.adjustmentRequest.update({
      where: { id: adjustmentRequestId },
      data: {
        status: "APPLIED",
        appliedAt: new Date(),
        appliedBy: appliedByUserId,
        invoiceAdjustmentId: invoiceAdj.id,
      },
    });

    return invoiceAdj.id;
  });

  logAudit({
    userId: appliedByUserId,
    action: "ADJUSTMENT_APPLIED",
    entity: "AdjustmentRequest",
    entityId: adjustmentRequestId,
    metadata: {
      invoiceId: adjustment.invoiceId,
      delta: adjustment.delta,
      invoicePaid: false,
    },
  }).catch((err) =>
    console.error("[AuditLog] ADJUSTMENT_APPLIED failed:", err),
  );

  const { sendInvoiceNotification } = await import("../email/notificationService");
  sendInvoiceNotification(adjustment.invoiceId!, "adjustmentApplied", {
    adjustmentAmount: adjustment.delta,
  }).catch((err) =>
    console.error("[Notification] sendInvoiceNotification:", err),
  );

  return { success: true, invoiceAdjustmentId: invoiceAdjId };
}
