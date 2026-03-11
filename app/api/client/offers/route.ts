import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const coupons = await prisma.coupon.findMany({
    where: {
      active: true,
      validFrom: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gte: now } }],
    },
    orderBy: [{ validUntil: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      code: true,
      description: true,
      type: true,
      value: true,
      minOrder: true,
      maxUses: true,
      usedCount: true,
      validUntil: true,
    },
  });

  const availableCoupons = coupons
    .filter((coupon) => coupon.maxUses === null || coupon.usedCount < coupon.maxUses)
    .map((coupon) => ({
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      minOrder: coupon.minOrder,
      maxUses: coupon.maxUses,
      validUntil: coupon.validUntil,
    }));

  return NextResponse.json({ offers: availableCoupons });
}
