import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { transitionOrderStatus } from "@/lib/orders/transitionGateway";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "DELIVERY") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  if (!["READY", "IN_TRANSIT"].includes(order.status)) {
    return NextResponse.json(
      { error: "La orden debe estar en estado READY o IN_TRANSIT" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const { receiverName, notes, items } = body as {
    receiverName: string;
    notes?: string;
    items: { orderItemId: string; deliveredQty: number; issue?: string; issueNotes?: string }[];
  };

  if (!receiverName || !items || items.length === 0) {
    return NextResponse.json({ error: "receiverName e items son requeridos" }, { status: 400 });
  }

  const orderItemMap = new Map(order.items.map((oi) => [oi.id, oi]));
  let hasIssues = false;

  const reportItems = items.map((item) => {
    const orderItem = orderItemMap.get(item.orderItemId);
    if (!orderItem) throw new Error(`OrderItem no encontrado: ${item.orderItemId}`);
    const expectedQty = orderItem.quantity;
    if (item.deliveredQty < expectedQty || item.issue) hasIssues = true;
    return { orderItemId: item.orderItemId, expectedQty, deliveredQty: item.deliveredQty, issue: item.issue, issueNotes: item.issueNotes };
  });

  const report = await prisma.$transaction(async (tx) => {
    const created = await tx.deliveryReport.create({
      data: {
        orderId,
        driverId: session.user.id,
        receiverName,
        hasIssues,
        notes: notes ?? null,
        items: {
          create: reportItems.map((ri) => ({
            orderItemId: ri.orderItemId,
            expectedQty: ri.expectedQty,
            deliveredQty: ri.deliveredQty,
            issue: ri.issue ?? null,
            issueNotes: ri.issueNotes ?? null,
          })),
        },
      },
      include: { items: true },
    });
    return created;
  });

  if (order.status === "READY" || order.status === "READY_FOR_PICKUP") {
    const toTransit = await transitionOrderStatus(
      orderId,
      "IN_TRANSIT",
      session.user.id,
      session.user.role,
      "Auto-paso previo desde delivery report",
      "api/deliveries/report/[orderId]#POST",
    );
    if (!toTransit.success) {
      return NextResponse.json({ error: toTransit.error }, { status: 400 });
    }
  }

  const toDelivered = await transitionOrderStatus(
    orderId,
    "DELIVERED",
    session.user.id,
    session.user.role,
    "Delivery report registrado",
    "api/deliveries/report/[orderId]#POST",
  );
  if (!toDelivered.success) {
    return NextResponse.json({ error: toDelivered.error }, { status: 400 });
  }

  await logAudit({
    userId: session.user.id,
    action: "DELIVERY_REPORT",
    entity: "DeliveryReport",
    entityId: report.id,
    metadata: { orderId, hasIssues, itemCount: reportItems.length },
  });

  return NextResponse.json(report, { status: 201 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !["DELIVERY", "SALES", "ADMIN", "MASTER"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { orderId } = await params;
  const report = await prisma.deliveryReport.findFirst({
    where: { orderId },
    include: {
      items: { include: { orderItem: true } },
      photos: true,
      driver: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!report) {
    return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
  }

  return NextResponse.json(report);
}
