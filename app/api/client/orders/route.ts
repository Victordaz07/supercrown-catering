import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { OrderStatus } from "@prisma/client";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "READY",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
  "QUOTE_PENDING",
  "IN_PREPARATION",
  "READY_FOR_PICKUP",
  "UNDER_REVIEW",
  "COMPLETED",
  "DISPUTED",
];

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "User email missing in session" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.trim().toUpperCase();
  const statusFilter = status && ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;

  const where: {
    customerEmail: { equals: string; mode: "insensitive" };
    status?: OrderStatus;
  } = {
    customerEmail: { equals: email, mode: "insensitive" },
  };

  if (statusFilter) where.status = statusFilter;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        select: {
          id: true,
          name: true,
          category: true,
          quantity: true,
          unitPrice: true,
        },
      },
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          dueDate: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({ orders });
}
