import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "User email missing in session" },
      { status: 400 },
    );
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      order: {
        customerEmail: { equals: email, mode: "insensitive" },
      },
    },
    include: {
      order: {
        select: {
          orderNumber: true,
          customerEmail: true,
          items: true,
        },
      },
      adjustments: { select: { amount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = invoices.map((inv) => {
    const adjustmentSum = inv.adjustments.reduce((sum, a) => sum + a.amount, 0);
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      orderId: inv.orderId,
      orderNumber: inv.order.orderNumber,
      total: inv.total,
      adjustmentSum,
      adjustedTotal: inv.total + adjustmentSum,
      status: inv.status,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      receiptUrl: inv.receiptUrl,
      createdAt: inv.createdAt,
    };
  });

  return NextResponse.json({ invoices: data });
}
