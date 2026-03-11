import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string; stopId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stopId } = await params;
  const body = await request.json();

  const stop = await prisma.routeStop.findUnique({
    where: { id: stopId },
    include: { route: true },
  });
  if (!stop) return NextResponse.json({ error: "Stop not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.status === "DELIVERED" || body.status === "EN_ROUTE") {
    data.arrivedAt = new Date();
  }

  const updated = await prisma.routeStop.update({ where: { id: stopId }, data });

  if (body.status === "DELIVERED") {
    await prisma.order.update({
      where: { id: stop.orderId },
      data: { status: "DELIVERED" },
    });

    const allStops = await prisma.routeStop.findMany({ where: { routeId: stop.routeId } });
    const allDone = allStops.every((s) => s.id === stopId || s.status === "DELIVERED" || s.status === "SKIPPED");
    if (allDone) {
      await prisma.deliveryRoute.update({ where: { id: stop.routeId }, data: { status: "COMPLETED" } });
    }
  }

  if (body.status === "EN_ROUTE") {
    await prisma.order.update({ where: { id: stop.orderId }, data: { status: "IN_TRANSIT" } });
    await prisma.deliveryRoute.update({ where: { id: stop.routeId }, data: { status: "IN_PROGRESS" } });
  }

  return NextResponse.json(updated);
}
