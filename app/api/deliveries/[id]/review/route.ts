import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const VALID_STATUSES = ["APPROVED", "REJECTED", "ESCALATED"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !["SALES", "ADMIN", "MASTER"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: reportId } = await params;

  const report = await prisma.deliveryReport.findUnique({
    where: { id: reportId },
    include: { photos: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
  }

  if (report.driverId === session.user.id) {
    return NextResponse.json({ error: "No puedes revisar tu propio reporte" }, { status: 403 });
  }

  if (report.status !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "Este reporte ya fue revisado" }, { status: 400 });
  }

  const body = await request.json();
  const { status, reviewNotes } = body as { status: string; reviewNotes?: string };

  if (!status || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json({ error: `Estado inválido. Válidos: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }

  if (report.hasIssues && status === "APPROVED") {
    const hasSignedPhoto = report.photos.some((p) =>
      ["SIGNED_INVOICE_DRIVER", "SIGNED_INVOICE_CLIENT"].includes(p.photoType),
    );
    if (!hasSignedPhoto) {
      return NextResponse.json(
        { error: "Para aprobar con incidencias se requiere al menos una foto de factura firmada" },
        { status: 400 },
      );
    }
  }

  const oldStatus = report.status;

  const updated = await prisma.deliveryReport.update({
    where: { id: reportId },
    data: { status, reviewedById: session.user.id, reviewNotes: reviewNotes ?? null, reviewedAt: new Date() },
    include: {
      items: { include: { orderItem: true } },
      photos: true,
      driver: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "STATUS_CHANGE",
    entity: "DeliveryReport",
    entityId: reportId,
    field: "status",
    oldValue: oldStatus,
    newValue: status,
    metadata: { reviewNotes: reviewNotes ?? null, hasIssues: report.hasIssues },
  });

  return NextResponse.json(updated);
}
