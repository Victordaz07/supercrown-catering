import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED_ROLES = ["MASTER", "ADMIN", "SALES"] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");

  const where = itemId ? { itemId } : {};

  const tiers = await prisma.priceTier.findMany({
    where,
    orderBy: [{ itemId: "asc" }, { minQty: "asc" }],
  });

  return NextResponse.json(tiers);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { itemId, itemName, minQty, unitPrice, discountPct } = body as {
    itemId?: string;
    itemName?: string;
    minQty?: number;
    unitPrice?: number;
    discountPct?: number;
  };

  if (!itemId?.trim()) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }
  if (!itemName?.trim()) {
    return NextResponse.json({ error: "itemName is required" }, { status: 400 });
  }
  if (minQty == null || typeof minQty !== "number" || minQty < 0) {
    return NextResponse.json({ error: "minQty is required and must be a non-negative number" }, { status: 400 });
  }
  if (unitPrice == null || typeof unitPrice !== "number" || unitPrice < 0) {
    return NextResponse.json({ error: "unitPrice is required and must be a non-negative number" }, { status: 400 });
  }

  const discount = discountPct != null ? Number(discountPct) : 0;
  if (discount < 0 || discount > 100) {
    return NextResponse.json({ error: "discountPct must be between 0 and 100" }, { status: 400 });
  }

  try {
    const tier = await prisma.priceTier.create({
      data: {
        itemId: itemId.trim(),
        itemName: itemName.trim(),
        minQty,
        unitPrice,
        discountPct: discount,
      },
    });
    return NextResponse.json(tier, { status: 201 });
  } catch (e) {
    const prismaError = e as { code?: string };
    if (prismaError.code === "P2002") {
      return NextResponse.json(
        { error: "A price tier already exists for this item with the same minQty" },
        { status: 409 },
      );
    }
    throw e;
  }
}
