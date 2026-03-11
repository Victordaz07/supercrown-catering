import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  const where: {
    customerEmail: { equals: string; mode: "insensitive" };
    status?: string;
  } = {
    customerEmail: { equals: email, mode: "insensitive" },
  };

  if (status) where.status = status;

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
