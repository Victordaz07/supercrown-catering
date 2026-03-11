import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };
const VALID_ORDER_STATUSES = ["PENDING", "CONFIRMED", "READY", "IN_TRANSIT", "DELIVERED", "CANCELLED"] as const;

function isWorkflowTransition(fromStatus: string, toStatus: string): boolean {
  return (
    (fromStatus === "PENDING" && toStatus === "CONFIRMED") ||
    (fromStatus === "CONFIRMED" && toStatus === "READY") ||
    (fromStatus === "READY" && toStatus === "IN_TRANSIT") ||
    (fromStatus === "IN_TRANSIT" && toStatus === "DELIVERED")
  );
}

export async function GET(request: Request, { params }: RouteContext) {
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

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["MASTER", "ADMIN", "SALES"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const uid = session.user.id;

  // --- Status change ---
  if (body.status) {
    if (!VALID_ORDER_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (
      session.user.role === "SALES" &&
      !isWorkflowTransition(order.status, body.status)
    ) {
      return NextResponse.json(
        {
          error:
            "Manual status changes require ADMIN/MASTER approval. Submit a status request.",
        },
        { status: 403 }
      );
    }
    if (order.status !== body.status) {
      await logAudit({ userId: uid, action: "STATUS_CHANGE", entity: "Order", entityId: id, field: "status", oldValue: order.status, newValue: body.status });
    }
  }

  // --- Simple field updates with audit ---
  const editableFields: Array<{ key: string; dbKey?: string }> = [
    { key: "customerName" },
    { key: "customerEmail" },
    { key: "customerPhone" },
    { key: "deliveryAddress" },
    { key: "guestCount" },
    { key: "eventDetails" },
    { key: "notes" },
    { key: "discountType" },
    { key: "discountValue" },
    { key: "discountAmount" },
  ];

  const orderUpdate: Record<string, unknown> = {};

  if (body.status) orderUpdate.status = body.status;

  for (const { key, dbKey } of editableFields) {
    if (body[key] !== undefined) {
      const fieldName = dbKey || key;
      const oldVal = (order as Record<string, unknown>)[fieldName];
      if (String(oldVal ?? "") !== String(body[key] ?? "")) {
        await logAudit({ userId: uid, action: "UPDATE", entity: "Order", entityId: id, field: fieldName, oldValue: String(oldVal ?? ""), newValue: String(body[key] ?? "") });
      }
      orderUpdate[fieldName] = body[key];
    }
  }

  if (body.driverId !== undefined) {
    const nextDriverId = body.driverId || null;
    const previousDriverId = (order as Record<string, unknown>).driverId as string | null;

    orderUpdate.driverId = nextDriverId;
    await logAudit({
      userId: uid,
      action: "UPDATE",
      entity: "Order",
      entityId: id,
      field: "driverId",
      oldValue: previousDriverId || "",
      newValue: nextDriverId || "",
    });

    if (nextDriverId) {
      const driver = await prisma.user.findUnique({
        where: { id: nextDriverId },
        select: { id: true, role: true },
      });
      if (!driver || driver.role !== "DELIVERY") {
        return NextResponse.json({ error: "Invalid driver" }, { status: 400 });
      }

      const routeDate = new Date(order.eventDate);
      routeDate.setHours(0, 0, 0, 0);

      const route = await prisma.deliveryRoute.upsert({
        where: { driverId_date: { driverId: nextDriverId, date: routeDate } },
        update: {},
        create: {
          driverId: nextDriverId,
          date: routeDate,
        },
      });

      const existingStops = await prisma.routeStop.findMany({
        where: { orderId: id },
        select: { id: true, routeId: true },
      });

      // Keep a single source of truth: one order belongs to one route stop.
      const stopOnTargetRoute = existingStops.find((s) => s.routeId === route.id);
      const stopsToRemove = existingStops.filter((s) => s.routeId !== route.id);
      for (const stop of stopsToRemove) {
        await prisma.routeStop.delete({ where: { id: stop.id } });
      }

      if (!stopOnTargetRoute) {
        const lastStop = await prisma.routeStop.findFirst({
          where: { routeId: route.id },
          orderBy: { stopOrder: "desc" },
          select: { stopOrder: true },
        });
        await prisma.routeStop.create({
          data: {
            routeId: route.id,
            orderId: id,
            stopOrder: (lastStop?.stopOrder ?? -1) + 1,
          },
        });
      }
    } else {
      const existingStops = await prisma.routeStop.findMany({
        where: { orderId: id },
        select: { id: true, routeId: true },
      });
      for (const stop of existingStops) {
        await prisma.routeStop.delete({ where: { id: stop.id } });
      }
    }
  }

  if (body.eventDate !== undefined) {
    const newDate = new Date(body.eventDate);
    if (order.eventDate.toISOString() !== newDate.toISOString()) {
      await logAudit({ userId: uid, action: "UPDATE", entity: "Order", entityId: id, field: "eventDate", oldValue: order.eventDate.toISOString(), newValue: newDate.toISOString() });
    }
    orderUpdate.eventDate = newDate;
  }

  if (body.couponId !== undefined) {
    orderUpdate.couponId = body.couponId || null;
  }

  // --- Add items ---
  if (Array.isArray(body.addItems) && body.addItems.length > 0) {
    for (const item of body.addItems) {
      const created = await prisma.orderItem.create({
        data: {
          orderId: id,
          itemId: item.itemId || "custom",
          name: item.name,
          category: item.category || "Custom",
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
        },
      });
      await logAudit({ userId: uid, action: "CREATE", entity: "OrderItem", entityId: created.id, newValue: `${item.name} x${item.quantity}`, metadata: { orderId: id } });
    }
  }

  // --- Remove items ---
  if (Array.isArray(body.removeItems) && body.removeItems.length > 0) {
    for (const itemId of body.removeItems) {
      const existing = order.items.find((i) => i.id === itemId);
      if (!existing) continue;
      await prisma.orderItem.delete({ where: { id: itemId } });
      await logAudit({ userId: uid, action: "DELETE", entity: "OrderItem", entityId: itemId, oldValue: `${existing.name} x${existing.quantity}`, metadata: { orderId: id } });
    }
  }

  // --- Update items ---
  if (Array.isArray(body.updateItems) && body.updateItems.length > 0) {
    for (const upd of body.updateItems) {
      const existing = order.items.find((i) => i.id === upd.id);
      if (!existing) continue;

      const data: Record<string, unknown> = {};
      if (upd.quantity !== undefined && upd.quantity !== existing.quantity) {
        data.quantity = upd.quantity;
        await logAudit({ userId: uid, action: "UPDATE", entity: "OrderItem", entityId: upd.id, field: "quantity", oldValue: String(existing.quantity), newValue: String(upd.quantity), metadata: { orderId: id } });
      }
      if (upd.unitPrice !== undefined && upd.unitPrice !== existing.unitPrice) {
        data.unitPrice = upd.unitPrice;
        await logAudit({ userId: uid, action: "UPDATE", entity: "OrderItem", entityId: upd.id, field: "unitPrice", oldValue: String(existing.unitPrice), newValue: String(upd.unitPrice), metadata: { orderId: id } });
      }
      if (Object.keys(data).length > 0) {
        await prisma.orderItem.update({ where: { id: upd.id }, data });
      }
    }
  }

  // --- Recalculate totalItems ---
  const updatedItems = await prisma.orderItem.findMany({ where: { orderId: id } });
  orderUpdate.totalItems = updatedItems.reduce((sum, i) => sum + i.quantity, 0);

  // --- Apply order update ---
  const updated = await prisma.order.update({
    where: { id },
    data: orderUpdate,
    include: { items: true, invoices: true },
  });

  return NextResponse.json(updated);
}
