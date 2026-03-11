import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const route = await prisma.deliveryRoute.findUnique({
    where: { id },
    include: {
      driver: { select: { id: true, name: true, phone: true } },
      stops: {
        include: {
          order: {
            select: { id: true, orderNumber: true, customerName: true, customerPhone: true, deliveryAddress: true, eventDate: true, totalItems: true, status: true, items: true },
          },
        },
        orderBy: { stopOrder: "asc" },
      },
    },
  });

  if (!route) return NextResponse.json({ error: "Route not found" }, { status: 404 });
  return NextResponse.json(route);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN", "SALES", "DELIVERY"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const route = await prisma.deliveryRoute.findUnique({ where: { id }, include: { stops: true } });
  if (!route) return NextResponse.json({ error: "Route not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.startAddress !== undefined) data.startAddress = body.startAddress;

  if (Object.keys(data).length > 0) {
    await prisma.deliveryRoute.update({ where: { id }, data });
  }

  if (Array.isArray(body.addStops)) {
    for (const stop of body.addStops) {
      const maxOrder = route.stops.length > 0 ? Math.max(...route.stops.map((s) => s.stopOrder)) : -1;
      await prisma.routeStop.create({
        data: { routeId: id, orderId: stop.orderId, stopOrder: stop.stopOrder ?? maxOrder + 1 },
      });
      await prisma.order.update({ where: { id: stop.orderId }, data: { driverId: route.driverId } });
    }
  }

  if (Array.isArray(body.removeStops)) {
    for (const stopId of body.removeStops) {
      const stop = await prisma.routeStop.findUnique({ where: { id: stopId } });
      if (stop) {
        await prisma.routeStop.delete({ where: { id: stopId } });
        await prisma.order.update({ where: { id: stop.orderId }, data: { driverId: null } });
      }
    }
  }

  if (Array.isArray(body.reorderStops)) {
    for (const { id: stopId, stopOrder } of body.reorderStops) {
      await prisma.routeStop.update({ where: { id: stopId }, data: { stopOrder } });
    }
  }

  const updated = await prisma.deliveryRoute.findUnique({
    where: { id },
    include: {
      driver: { select: { id: true, name: true } },
      stops: {
        include: { order: { select: { id: true, orderNumber: true, deliveryAddress: true, customerName: true, status: true } } },
        orderBy: { stopOrder: "asc" },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN", "SALES"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const route = await prisma.deliveryRoute.findUnique({ where: { id }, include: { stops: true } });
  if (!route) return NextResponse.json({ error: "Route not found" }, { status: 404 });

  for (const stop of route.stops) {
    await prisma.order.update({ where: { id: stop.orderId }, data: { driverId: null } });
  }

  await prisma.deliveryRoute.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
