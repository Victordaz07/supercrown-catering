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

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const reports = await prisma.deliveryReport.findMany({
    where,
    include: {
      driver: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          invoices: { select: { id: true, invoiceNumber: true }, take: 1 },
        },
      },
      items: { include: { orderItem: { select: { name: true, category: true } } } },
      photos: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reports);
}
