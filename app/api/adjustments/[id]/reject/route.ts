import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MASTER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { reviewNotes } = body as { reviewNotes?: string };

  if (!reviewNotes || typeof reviewNotes !== "string" || reviewNotes.trim().length < 5) {
    return NextResponse.json(
      { error: "La razón de rechazo es obligatoria (mínimo 5 caracteres)" },
      { status: 400 },
    );
  }

  const adjustment = await prisma.adjustmentRequest.findUnique({
    where: { id },
  });

  if (!adjustment) {
    return NextResponse.json({ error: "Solicitud de ajuste no encontrada" }, { status: 404 });
  }

  if (adjustment.status !== "PENDING" && adjustment.status !== "UNDER_REVIEW") {
    return NextResponse.json(
      { error: "No se puede rechazar: la solicitud ya fue procesada" },
      { status: 400 },
    );
  }

  const updated = await prisma.adjustmentRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes.trim(),
    },
    include: {
      order: { select: { orderNumber: true } },
      requestedByUser: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "ADJUSTMENT_REJECTED",
    entity: "AdjustmentRequest",
    entityId: id,
    metadata: {
      orderId: adjustment.orderId,
      delta: adjustment.delta,
      reviewNotes: reviewNotes.trim(),
    },
  }).catch((err) =>
    console.error("[AuditLog] ADJUSTMENT_REJECTED failed:", err),
  );

  return NextResponse.json({ adjustmentRequest: updated });
}
