import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const ALLOWED_ROLES = ["MASTER", "ADMIN", "SALES"];
const VALID_TYPES = ["CREDIT", "DISCOUNT", "REFUND"];

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: invoiceId } = await params;
  const body = await request.json();
  const { type, reason, deliveryReportId, items, amount, orderId, requiresApproval } = body;

  if (orderId && requiresApproval !== false) {
    return NextResponse.json(
      {
        error:
          "Los ajustes vinculados a órdenes requieren aprobación formal. " +
          "Usa POST /api/adjustments para crear la solicitud.",
      },
      { status: 422 },
    );
  }

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: "Invalid type", validTypes: VALID_TYPES },
      { status: 400 }
    );
  }

  if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
    return NextResponse.json(
      { error: "reason is required and must be at least 10 characters" },
      { status: 400 }
    );
  }

  if (typeof amount !== "number" || amount >= 0) {
    return NextResponse.json(
      { error: "amount must be a negative number (deduction)" },
      { status: 400 }
    );
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { adjustments: { select: { amount: true } } },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "VOID") {
    return NextResponse.json(
      { error: "Cannot adjust a voided invoice" },
      { status: 400 }
    );
  }

  if (deliveryReportId) {
    const report = await prisma.deliveryReport.findUnique({
      where: { id: deliveryReportId },
    });
    if (!report) {
      return NextResponse.json(
        { error: "Delivery report not found" },
        { status: 404 }
      );
    }
    if (report.orderId !== invoice.orderId) {
      return NextResponse.json(
        { error: "Delivery report does not belong to the same order" },
        { status: 400 }
      );
    }
  }

  const adjustedItems = items ? JSON.stringify(items) : null;

  const adjustment = await prisma.invoiceAdjustment.create({
    data: {
      invoiceId,
      type,
      reason: reason.trim(),
      amount,
      adjustedItems,
      deliveryReportId: deliveryReportId ?? null,
      approvedById: session.user.id,
    },
    include: {
      approvedBy: { select: { id: true, name: true } },
      deliveryReport: { select: { id: true } },
    },
  });

  const allAdjustmentAmounts = [
    ...invoice.adjustments.map((a) => a.amount),
    amount,
  ];
  const adjustmentSum = allAdjustmentAmounts.reduce((sum, a) => sum + a, 0);
  const adjustedTotal = invoice.total + adjustmentSum;

  // VOID already returned above; only update status if not already ADJUSTED
  const needsStatusUpdate = invoice.status !== "ADJUSTED";

  if (needsStatusUpdate) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "ADJUSTED" },
    });
  }

  await logAudit({
    userId: session.user.id,
    action: "ADJUSTMENT",
    entity: "InvoiceAdjustment",
    entityId: adjustment.id,
    field: "amount",
    oldValue: String(invoice.total),
    newValue: String(adjustedTotal),
    metadata: {
      invoiceId,
      type,
      reason: reason.trim(),
      amount,
      deliveryReportId: deliveryReportId ?? null,
    },
  });

  if (needsStatusUpdate) {
    await logAudit({
      userId: session.user.id,
      action: "STATUS_CHANGE",
      entity: "Invoice",
      entityId: invoiceId,
      field: "status",
      oldValue: invoice.status,
      newValue: "ADJUSTED",
    });
  }

  return NextResponse.json({
    adjustment,
    invoice: {
      id: invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      originalTotal: invoice.total,
      adjustmentSum,
      adjustedTotal,
      status: needsStatusUpdate ? "ADJUSTED" : invoice.status,
    },
  });
}

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: invoiceId } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, invoiceNumber: true, total: true, status: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const adjustments = await prisma.invoiceAdjustment.findMany({
    where: { invoiceId },
    include: {
      approvedBy: { select: { id: true, name: true } },
      deliveryReport: {
        select: { id: true, orderId: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const adjustmentSum = adjustments.reduce((sum, a) => sum + a.amount, 0);

  return NextResponse.json({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    originalTotal: invoice.total,
    adjustmentSum,
    adjustedTotal: invoice.total + adjustmentSum,
    adjustments,
  });
}
