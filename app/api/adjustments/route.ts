import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  shouldAutoApprove,
  getRequiredApprovers,
} from "@/lib/adjustments/authorizationRules";
import { applyAdjustmentToInvoice } from "@/lib/adjustments/applyAdjustment";
import type { AdjustmentType } from "@prisma/client";

const ADJUSTMENT_TYPES: AdjustmentType[] = [
  "ITEM_SHORTAGE",
  "ITEM_DAMAGE",
  "PRICE_ERROR",
  "LATE_DELIVERY",
  "OTHER",
];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["SALES", "ADMIN", "MASTER"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    orderId,
    invoiceId,
    deliveryReportId,
    type,
    description,
    originalAmount,
    requestedAmount,
  } = body as {
    orderId?: string;
    invoiceId?: string;
    deliveryReportId?: string;
    type?: string;
    description?: string;
    originalAmount?: number;
    requestedAmount?: number;
  };

  if (!orderId || !type || !description || originalAmount === undefined || requestedAmount === undefined) {
    return NextResponse.json(
      { error: "orderId, type, description, originalAmount y requestedAmount son requeridos" },
      { status: 400 },
    );
  }

  if (!ADJUSTMENT_TYPES.includes(type as AdjustmentType)) {
    return NextResponse.json(
      { error: "Tipo inválido", validTypes: ADJUSTMENT_TYPES },
      { status: 400 },
    );
  }

  if (typeof description !== "string" || description.trim().length < 10) {
    return NextResponse.json(
      { error: "description debe tener al menos 10 caracteres" },
      { status: 400 },
    );
  }

  const delta = originalAmount - requestedAmount;
  if (delta <= 0) {
    return NextResponse.json(
      { error: "El monto ajustado debe ser menor al original" },
      { status: 400 },
    );
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  if (invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, orderId },
    });
    if (!invoice) {
      return NextResponse.json(
        { error: "Factura no encontrada o no pertenece a la orden" },
        { status: 404 },
      );
    }
  }

  if (deliveryReportId) {
    const report = await prisma.deliveryReport.findFirst({
      where: { id: deliveryReportId, orderId },
    });
    if (!report) {
      return NextResponse.json(
        { error: "Reporte de entrega no encontrado o no pertenece a la orden" },
        { status: 404 },
      );
    }
  }

  const autoApproved = shouldAutoApprove(delta);
  const status = autoApproved ? "APPROVED" : "PENDING";

  const adjustmentRequest = await prisma.adjustmentRequest.create({
    data: {
      orderId,
      invoiceId: invoiceId ?? null,
      deliveryReportId: deliveryReportId ?? null,
      type: type as AdjustmentType,
      description: description.trim(),
      originalAmount,
      requestedAmount,
      delta,
      status,
      requestedBy: session.user.id,
    },
    include: {
      order: { select: { orderNumber: true } },
      invoice: { select: { invoiceNumber: true } },
      requestedByUser: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "ADJUSTMENT_REQUESTED",
    entity: "AdjustmentRequest",
    entityId: adjustmentRequest.id,
    metadata: {
      orderId,
      delta,
      autoApproved,
      status,
    },
  }).catch((err) =>
    console.error("[AuditLog] ADJUSTMENT_REQUESTED failed:", err),
  );

  if (autoApproved && invoiceId) {
    const applyResult = await applyAdjustmentToInvoice(
      adjustmentRequest.id,
      session.user.id,
    );
    if (!applyResult.success) {
      console.warn(
        `[Adjustments] Auto-apply falló para ${adjustmentRequest.id}:`,
        applyResult.error,
      );
    }
  }

  return NextResponse.json({
    adjustmentRequest,
    autoApproved,
    requiredApprovers: getRequiredApprovers(delta),
  });
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["SALES", "ADMIN", "MASTER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const orderId = searchParams.get("orderId");
  const invoiceId = searchParams.get("invoiceId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (orderId) where.orderId = orderId;
  if (invoiceId) where.invoiceId = invoiceId;
  if (from || to) {
    where.createdAt = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(`${to}T23:59:59.999Z`) }),
    };
  }

  const requests = await prisma.adjustmentRequest.findMany({
    where,
    include: {
      order: { select: { orderNumber: true } },
      invoice: { select: { invoiceNumber: true } },
      requestedByUser: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}
