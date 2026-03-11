import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const driverId = searchParams.get("driverId");
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  const where: Record<string, unknown> = {};

  if (dateStr) {
    rangeStart = new Date(dateStr);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    where.date = { gte: rangeStart, lt: rangeEnd };
  }

  if (driverId) {
    where.driverId = driverId;
  }

  if (session.user.role === "DELIVERY") {
    where.driverId = session.user.id;

    // Backfill daily route stops from already-assigned orders so the driver app
    // and order assignment stay aligned even for legacy/manual assignments.
    if (rangeStart && rangeEnd) {
      const assignedOrders = await prisma.order.findMany({
        where: {
          driverId: session.user.id,
          eventDate: { gte: rangeStart, lt: rangeEnd },
          status: { in: ["READY", "IN_TRANSIT"] },
        },
        select: { id: true },
      });

      if (assignedOrders.length > 0) {
        const route = await prisma.deliveryRoute.upsert({
          where: { driverId_date: { driverId: session.user.id, date: rangeStart } },
          update: {},
          create: {
            driverId: session.user.id,
            date: rangeStart,
          },
          select: { id: true },
        });

        const existingStops = await prisma.routeStop.findMany({
          where: { routeId: route.id },
          select: { orderId: true, stopOrder: true },
        });
        const existingOrderIds = new Set(existingStops.map((s) => s.orderId));
        let nextStopOrder =
          existingStops.length > 0
            ? Math.max(...existingStops.map((s) => s.stopOrder)) + 1
            : 0;

        for (const order of assignedOrders) {
          if (existingOrderIds.has(order.id)) continue;
          await prisma.routeStop.create({
            data: {
              routeId: route.id,
              orderId: order.id,
              stopOrder: nextStopOrder,
            },
          });
          nextStopOrder += 1;
        }
      }
    }
  }

  const routes = await prisma.deliveryRoute.findMany({
    where,
    include: {
      driver: { select: { id: true, name: true, phone: true } },
      stops: {
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              customerPhone: true,
              deliveryAddress: true,
              eventDate: true,
              totalItems: true,
              status: true,
            },
          },
        },
        orderBy: { stopOrder: "asc" },
      },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(routes);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["MASTER", "ADMIN", "SALES"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { driverId, date, stops, startAddress, notes } = body as {
    driverId?: string;
    date?: string;
    stops?: Array<{ orderId: string; stopOrder: number }>;
    startAddress?: string;
    notes?: string;
  };

  if (!driverId || !date) {
    return NextResponse.json({ error: "driverId and date are required" }, { status: 400 });
  }

  const driver = await prisma.user.findUnique({ where: { id: driverId } });
  if (!driver || driver.role !== "DELIVERY") {
    return NextResponse.json({ error: "Invalid driver" }, { status: 400 });
  }

  const routeDate = new Date(date);
  routeDate.setHours(0, 0, 0, 0);

  const route = await prisma.deliveryRoute.upsert({
    where: { driverId_date: { driverId, date: routeDate } },
    update: {
      notes: notes || undefined,
      startAddress: startAddress || undefined,
    },
    create: {
      driverId,
      date: routeDate,
      startAddress: startAddress || null,
      notes: notes || null,
    },
  });

  if (Array.isArray(stops) && stops.length > 0) {
    for (const stop of stops) {
      const order = await prisma.order.findUnique({ where: { id: stop.orderId } });
      if (!order) continue;

      await prisma.routeStop.create({
        data: {
          routeId: route.id,
          orderId: stop.orderId,
          stopOrder: stop.stopOrder,
        },
      });

      await prisma.order.update({
        where: { id: stop.orderId },
        data: { driverId },
      });
    }
  }

  const result = await prisma.deliveryRoute.findUnique({
    where: { id: route.id },
    include: {
      driver: { select: { id: true, name: true } },
      stops: {
        include: { order: { select: { id: true, orderNumber: true, deliveryAddress: true, customerName: true } } },
        orderBy: { stopOrder: "asc" },
      },
    },
  });

  return NextResponse.json(result, { status: 201 });
}
