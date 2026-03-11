import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const { code, subtotal } = body as { code?: string; subtotal?: number };

  if (!code?.trim()) {
    return NextResponse.json(
      { error: "Code is required" },
      { status: 400 },
    );
  }
  if (subtotal === undefined || subtotal === null || subtotal < 0) {
    return NextResponse.json(
      { error: "Subtotal must be a non-negative number" },
      { status: 400 },
    );
  }

  const coupon = await prisma.coupon.findFirst({
    where: { code: { equals: code.trim(), mode: "insensitive" } },
  });

  if (!coupon) {
    return NextResponse.json(
      { error: "Invalid coupon code" },
      { status: 404 },
    );
  }

  if (!coupon.active) {
    return NextResponse.json(
      { error: "Coupon is not active" },
      { status: 400 },
    );
  }

  const now = new Date();
  if (coupon.validFrom > now) {
    return NextResponse.json(
      { error: "Coupon is not yet valid" },
      { status: 400 },
    );
  }
  if (coupon.validUntil && coupon.validUntil < now) {
    return NextResponse.json(
      { error: "Coupon has expired" },
      { status: 400 },
    );
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json(
      { error: "Coupon has reached maximum uses" },
      { status: 400 },
    );
  }
  if (coupon.minOrder !== null && subtotal < coupon.minOrder) {
    return NextResponse.json(
      {
        error: `Minimum order amount is ${coupon.minOrder}`,
        minOrder: coupon.minOrder,
      },
      { status: 400 },
    );
  }

  let discountAmount: number;
  if (coupon.type === "PERCENTAGE") {
    discountAmount = subtotal * (coupon.value / 100);
  } else {
    discountAmount = Math.min(coupon.value, subtotal);
  }

  return NextResponse.json({
    coupon: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
    },
    discountAmount,
    subtotal,
  });
}
