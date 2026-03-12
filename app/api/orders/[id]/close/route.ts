import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  checkOrderClosure,
  attemptOrderClosure,
} from "@/lib/orders/closeOrder";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: orderId } = await params;

  const result = await checkOrderClosure(orderId);
  if (!result.canClose) {
    return NextResponse.json(
      {
        error: "No se puede cerrar la orden",
        blockers: result.blockers,
      },
      { status: 409 },
    );
  }

  const closure = await attemptOrderClosure(orderId, session.user.id);
  if (!closure.closed) {
    return NextResponse.json(
      {
        error: "Error al cerrar la orden",
        reason: closure.reason,
      },
      { status: 409 },
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  return NextResponse.json({ success: true, order });
}
