import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: {
      id,
      order: {
        customerEmail: { equals: email, mode: "insensitive" },
      },
    },
    include: {
      order: {
        include: {
          items: true,
        },
      },
      adjustments: {
        include: { approvedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json(
      { error: "Factura no encontrada o no tienes acceso" },
      { status: 404 },
    );
  }

  const adjustmentSum = invoice.adjustments.reduce((sum, a) => sum + a.amount, 0);

  return NextResponse.json({
    ...invoice,
    adjustmentSum,
    adjustedTotal: invoice.total + adjustmentSum,
  });
}
