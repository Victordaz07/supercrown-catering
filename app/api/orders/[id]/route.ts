import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, invoices: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["MASTER", "ADMIN", "SALES"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, notes } = body;

  const validStatuses = ["PENDING", "CONFIRMED", "READY", "IN_TRANSIT", "DELIVERED", "CANCELLED"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const oldStatus = order.status;

  await prisma.order.update({
    where: { id },
    data: {
      status,
      ...(notes !== undefined && { notes }),
    },
  });

  if (oldStatus !== status) {
    await logAudit({
      userId: session.user.id,
      action: "STATUS_CHANGE",
      entity: "Order",
      entityId: id,
      field: "status",
      oldValue: oldStatus,
      newValue: status,
    });
  }

  if (notes !== undefined && notes !== order.notes) {
    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Order",
      entityId: id,
      field: "notes",
      oldValue: order.notes,
      newValue: notes,
    });
  }

  return NextResponse.json({ success: true });
}
