import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["SALES", "ADMIN", "MASTER"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const adjustment = await prisma.adjustmentRequest.findUnique({
    where: { id },
    include: {
      order: { select: { orderNumber: true, customerName: true } },
      invoice: { select: { invoiceNumber: true, total: true, status: true } },
      deliveryReport: { select: { id: true, status: true } },
      requestedByUser: { select: { id: true, name: true } },
      reviewedByUser: { select: { id: true, name: true } },
      appliedByUser: { select: { id: true, name: true } },
    },
  });

  if (!adjustment) {
    return NextResponse.json({ error: "Solicitud de ajuste no encontrada" }, { status: 404 });
  }

  return NextResponse.json(adjustment);
}
