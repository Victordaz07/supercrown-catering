import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }

  const body = await request.json();
  const {
    description,
    type,
    value,
    minOrder,
    maxUses,
    validUntil,
    active,
  } = body as {
    description?: string;
    type?: string;
    value?: number;
    minOrder?: number;
    maxUses?: number;
    validUntil?: string | null;
    active?: boolean;
  };

  const data: Record<string, unknown> = {};

  if (description !== undefined) data.description = description?.trim() || null;
  if (type !== undefined) {
    if (!["PERCENTAGE", "FIXED"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be PERCENTAGE or FIXED" },
        { status: 400 },
      );
    }
    data.type = type;
  }
  if (value !== undefined) {
    if (value <= 0) {
      return NextResponse.json(
        { error: "Value must be greater than 0" },
        { status: 400 },
      );
    }
    data.value = value;
  }
  if (minOrder !== undefined) data.minOrder = minOrder ?? null;
  if (maxUses !== undefined) data.maxUses = maxUses ?? null;
  if (validUntil !== undefined) data.validUntil = validUntil ? new Date(validUntil) : null;
  if (active !== undefined) data.active = active;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const updated = await prisma.coupon.update({
    where: { id },
    data,
    include: { _count: { select: { orders: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }

  if (coupon.usedCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete coupon that has been used" },
      { status: 400 },
    );
  }

  await prisma.coupon.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
