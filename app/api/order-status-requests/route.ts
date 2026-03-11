import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const VALID_ORDER_STATUS = ["PENDING", "CONFIRMED", "READY", "IN_TRANSIT", "DELIVERED", "CANCELLED"];

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN", "SALES"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const orderId = searchParams.get("orderId");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (orderId) where.orderId = orderId;

  if (session.user.role === "SALES") {
    where.requestedById = session.user.id;
  }

  const requests = await prisma.orderStatusRequest.findMany({
    where,
    include: {
      order: { select: { id: true, orderNumber: true, customerName: true, status: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN", "SALES"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { orderId, requestedStatus, reason } = body as {
    orderId?: string;
    requestedStatus?: string;
    reason?: string;
  };

  if (!orderId || !requestedStatus) {
    return NextResponse.json({ error: "orderId and requestedStatus are required" }, { status: 400 });
  }
  if (!VALID_ORDER_STATUS.includes(requestedStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status === requestedStatus) {
    return NextResponse.json({ error: "Order already has that status" }, { status: 400 });
  }

  const created = await prisma.orderStatusRequest.create({
    data: {
      orderId,
      currentStatus: order.status,
      requestedStatus,
      reason: reason?.trim() || null,
      requestedById: session.user.id,
    },
    include: {
      order: { select: { id: true, orderNumber: true, customerName: true, status: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "OrderStatusRequest",
    entityId: created.id,
    metadata: {
      orderId,
      orderNumber: created.order.orderNumber,
      currentStatus: order.status,
      requestedStatus,
      reason: reason?.trim() || "",
    },
  });

  return NextResponse.json(created, { status: 201 });
}
