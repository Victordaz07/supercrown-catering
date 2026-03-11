import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN", "SALES"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const dateStr = searchParams.get("date");

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (dateStr) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    where.eventDate = { gte: d, lt: next };
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { eventDate: "asc" },
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerPhone: true,
      deliveryAddress: true,
      eventDate: true,
      totalItems: true,
      status: true,
      driverId: true,
    },
  });

  return NextResponse.json(orders);
}
