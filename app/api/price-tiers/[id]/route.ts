import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED_ROLES_CREATE_UPDATE = ["MASTER", "ADMIN", "SALES"] as const;
const ALLOWED_ROLES_DELETE = ["MASTER", "ADMIN"] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES_CREATE_UPDATE.includes(session.user.role as (typeof ALLOWED_ROLES_CREATE_UPDATE)[number])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.priceTier.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Price tier not found" }, { status: 404 });
  }

  const body = await request.json();
  const { minQty, unitPrice, discountPct, itemName } = body as {
    minQty?: number;
    unitPrice?: number;
    discountPct?: number;
    itemName?: string;
  };

  const data: Record<string, unknown> = {};

  if (minQty !== undefined) {
    if (typeof minQty !== "number" || minQty < 0) {
      return NextResponse.json({ error: "minQty must be a non-negative number" }, { status: 400 });
    }
    data.minQty = minQty;
  }
  if (unitPrice !== undefined) {
    if (typeof unitPrice !== "number" || unitPrice < 0) {
      return NextResponse.json({ error: "unitPrice must be a non-negative number" }, { status: 400 });
    }
    data.unitPrice = unitPrice;
  }
  if (discountPct !== undefined) {
    const discount = Number(discountPct);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      return NextResponse.json({ error: "discountPct must be between 0 and 100" }, { status: 400 });
    }
    data.discountPct = discount;
  }
  if (itemName !== undefined) {
    data.itemName = String(itemName).trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.priceTier.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
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

export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES_DELETE.includes(session.user.role as (typeof ALLOWED_ROLES_DELETE)[number])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.priceTier.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Price tier not found" }, { status: 404 });
  }

  await prisma.priceTier.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
