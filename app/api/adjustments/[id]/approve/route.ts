import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  canApproveAdjustment,
  getRequiredApprovers,
} from "@/lib/adjustments/authorizationRules";
import { applyAdjustmentToInvoice } from "@/lib/adjustments/applyAdjustment";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { reviewNotes } = body as { reviewNotes?: string };

  const adjustment = await prisma.adjustmentRequest.findUnique({
    where: { id },
    include: { order: { select: { orderNumber: true } } },
  });

  if (!adjustment) {
    return NextResponse.json({ error: "Solicitud de ajuste no encontrada" }, { status: 404 });
  }

  if (!canApproveAdjustment(session.user.role, adjustment.delta)) {
    const required = getRequiredApprovers(adjustment.delta);
    return NextResponse.json(
      {
        error:
          `Tu rol no puede aprobar ajustes de este monto. ` +
          `Requerido: ${required.join(" o ")}. Delta: $${adjustment.delta.toFixed(2)}`,
      },
      { status: 403 },
    );
  }

  if (adjustment.status !== "PENDING" && adjustment.status !== "UNDER_REVIEW") {
    return NextResponse.json(
      { error: "No se puede aprobar: la solicitud ya fue procesada" },
      { status: 400 },
    );
  }

  const updated = await prisma.adjustmentRequest.update({
    where: { id },
    data: {
      status: "APPROVED",
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes?.trim() ?? null,
    },
    include: {
      order: { select: { orderNumber: true } },
      invoice: { select: { invoiceNumber: true } },
      requestedByUser: { select: { id: true, name: true } },
    },
  });

  if (adjustment.invoiceId) {
    const applyResult = await applyAdjustmentToInvoice(id, session.user.id);
    if (!applyResult.success && applyResult.error !== "Solo ajustes aprobados pueden aplicarse") {
      console.warn(`[Adjustments] Apply falló tras aprobar ${id}:`, applyResult.error);
    }
  }

  await logAudit({
    userId: session.user.id,
    action: "ADJUSTMENT_APPROVED",
    entity: "AdjustmentRequest",
    entityId: id,
    metadata: {
      orderId: adjustment.orderId,
      delta: adjustment.delta,
      reviewNotes: reviewNotes?.trim() ?? null,
    },
  }).catch((err) =>
    console.error("[AuditLog] ADJUSTMENT_APPROVED failed:", err),
  );

  return NextResponse.json({ adjustmentRequest: updated });
}
