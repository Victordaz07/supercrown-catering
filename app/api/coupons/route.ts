import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });

  return NextResponse.json(coupons);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    code,
    description,
    type,
    value,
    minOrder,
    maxUses,
    validFrom,
    validUntil,
  } = body as {
    code?: string;
    description?: string;
    type?: string;
    value?: number;
    minOrder?: number;
    maxUses?: number;
    validFrom?: string;
    validUntil?: string;
  };

  if (!code?.trim()) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }
  if (!type || !["PERCENTAGE", "FIXED"].includes(type)) {
    return NextResponse.json(
      { error: "Type must be PERCENTAGE or FIXED" },
      { status: 400 },
    );
  }
  if (value === undefined || value === null || value <= 0) {
    return NextResponse.json(
      { error: "Value must be greater than 0" },
      { status: 400 },
    );
  }

  const normalizedCode = code.trim().toUpperCase();

  const existing = await prisma.coupon.findUnique({
    where: { code: normalizedCode },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A coupon with this code already exists" },
      { status: 409 },
    );
  }

  const data: {
    code: string;
    description?: string;
    type: string;
    value: number;
    minOrder?: number;
    maxUses?: number;
    validFrom?: Date;
    validUntil?: Date;
  } = {
    code: normalizedCode,
    type,
    value,
  };

  if (description !== undefined) data.description = description?.trim() || undefined;
  if (minOrder !== undefined) data.minOrder = minOrder ?? undefined;
  if (maxUses !== undefined) data.maxUses = maxUses ?? undefined;
  if (validFrom) data.validFrom = new Date(validFrom);
  if (validUntil !== undefined) data.validUntil = validUntil ? new Date(validUntil) : undefined;

  const coupon = await prisma.coupon.create({
    data,
    include: { _count: { select: { orders: true } } },
  });

  return NextResponse.json(coupon, { status: 201 });
}
