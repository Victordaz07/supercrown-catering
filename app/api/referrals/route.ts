import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SC-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      referralCode: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      totalSpent: true,
      totalOrders: true,
      leadScore: true,
    },
  });

  const referrals = await prisma.referral.findMany({
    where: { referrerId: session.user.id },
    include: { referred: { select: { name: true, email: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ user, referrals });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body as { action?: string };

  if (action === "generate-code") {
    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { referralCode: true },
    });
    if (existing?.referralCode) {
      return NextResponse.json({ code: existing.referralCode });
    }

    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const taken = await prisma.user.findUnique({ where: { referralCode: code } });
      if (!taken) break;
      code = generateCode();
      attempts++;
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { referralCode: code },
    });

    return NextResponse.json({ code });
  }

  if (action === "apply-code") {
    const { code } = body as { code?: string };
    if (!code?.trim()) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const referrer = await prisma.user.findUnique({
      where: { referralCode: code.trim().toUpperCase() },
    });
    if (!referrer) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }
    if (referrer.id === session.user.id) {
      return NextResponse.json({ error: "Cannot use your own referral code" }, { status: 400 });
    }

    const existing = await prisma.referral.findFirst({
      where: { referredId: session.user.id },
    });
    if (existing) {
      return NextResponse.json({ error: "You have already used a referral code" }, { status: 409 });
    }

    const referral = await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: session.user.id,
        status: "COMPLETED",
        rewardPoints: 100,
      },
    });

    await prisma.user.update({
      where: { id: referrer.id },
      data: { loyaltyPoints: { increment: 100 } },
    });
    await prisma.user.update({
      where: { id: session.user.id },
      data: { loyaltyPoints: { increment: 50 } },
    });

    return NextResponse.json({ referral, message: "Referral applied! You earned 50 points, your referrer earned 100 points." });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
