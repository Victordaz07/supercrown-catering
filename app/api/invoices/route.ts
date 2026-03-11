import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED_ROLES = ["MASTER", "ADMIN", "SALES"];

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (from || to) {
    where.createdAt = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(`${to}T23:59:59.999Z`) }),
    };
  }

  if (search) {
    where.order = {
      OR: [
        { customerName: { contains: search } },
        { orderNumber: { contains: search } },
      ],
    };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      order: {
        select: {
          customerName: true,
          customerEmail: true,
          orderNumber: true,
        },
      },
      adjustments: {
        select: { amount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = invoices.map((inv) => {
    const adjustmentSum = inv.adjustments.reduce((sum, a) => sum + a.amount, 0);
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      orderId: inv.orderId,
      subtotal: inv.subtotal,
      taxRate: inv.taxRate,
      taxAmount: inv.taxAmount,
      total: inv.total,
      adjustmentSum,
      adjustedTotal: inv.total + adjustmentSum,
      status: inv.status,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      paymentMethod: inv.paymentMethod,
      paymentRef: inv.paymentRef,
      pdfPathDriver: inv.pdfPathDriver,
      pdfPathClient: inv.pdfPathClient,
      notes: inv.notes,
      createdAt: inv.createdAt,
      order: {
        customerName: inv.order.customerName,
        customerEmail: inv.order.customerEmail,
        orderNumber: inv.order.orderNumber,
      },
    };
  });

  const totalInvoiced = data.reduce((sum, i) => sum + i.adjustedTotal, 0);
  const totalPaid = data
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.adjustedTotal, 0);
  const totalPending = data
    .filter((i) => ["DRAFT", "SENT", "DELIVERED", "ADJUSTED"].includes(i.status))
    .reduce((sum, i) => sum + i.adjustedTotal, 0);
  const totalOverdue = data
    .filter((i) => i.status === "OVERDUE")
    .reduce((sum, i) => sum + i.adjustedTotal, 0);

  return NextResponse.json({
    invoices: data,
    stats: { totalInvoiced, totalPaid, totalPending, totalOverdue },
    summary: { totalInvoiced, totalPaid, totalPending, totalOverdue },
  });
}
