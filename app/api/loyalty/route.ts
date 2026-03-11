import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 500,
  GOLD: 2000,
  PLATINUM: 5000,
};

function calculateTier(points: number): string {
  if (points >= TIER_THRESHOLDS.PLATINUM) return "PLATINUM";
  if (points >= TIER_THRESHOLDS.GOLD) return "GOLD";
  if (points >= TIER_THRESHOLDS.SILVER) return "SILVER";
  return "BRONZE";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      loyaltyPoints: true,
      loyaltyTier: true,
      totalSpent: true,
      totalOrders: true,
      leadScore: true,
      referralCode: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const currentTier = user.loyaltyTier;
  const nextTier = currentTier === "BRONZE" ? "SILVER" : currentTier === "SILVER" ? "GOLD" : currentTier === "GOLD" ? "PLATINUM" : null;
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier as keyof typeof TIER_THRESHOLDS] : null;
  const pointsToNext = nextThreshold ? Math.max(0, nextThreshold - user.loyaltyPoints) : 0;

  return NextResponse.json({
    ...user,
    tiers: TIER_THRESHOLDS,
    nextTier,
    pointsToNext,
    tierBenefits: {
      BRONZE: ["Track orders in real-time", "Order history access"],
      SILVER: ["5% discount on orders over $200", "Priority email support"],
      GOLD: ["10% discount on orders over $150", "Free delivery on orders over $300", "Priority phone support"],
      PLATINUM: ["15% discount on all orders", "Free delivery always", "Dedicated account manager", "Early access to seasonal menus"],
    },
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userId, addPoints, addSpent, recalculate } = body as {
    userId?: string;
    addPoints?: number;
    addSpent?: number;
    recalculate?: boolean;
  };

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (addPoints) {
    updates.loyaltyPoints = { increment: addPoints };
  }
  if (addSpent) {
    updates.totalSpent = { increment: addSpent };
    updates.totalOrders = { increment: 1 };
  }

  if (Object.keys(updates).length > 0) {
    await prisma.user.update({ where: { id: userId }, data: updates });
  }

  if (recalculate || addPoints) {
    const updated = await prisma.user.findUnique({ where: { id: userId }, select: { loyaltyPoints: true } });
    if (updated) {
      const newTier = calculateTier(updated.loyaltyPoints);
      await prisma.user.update({ where: { id: userId }, data: { loyaltyTier: newTier } });
    }
  }

  const result = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyaltyPoints: true, loyaltyTier: true, totalSpent: true, totalOrders: true, leadScore: true },
  });

  return NextResponse.json(result);
}
