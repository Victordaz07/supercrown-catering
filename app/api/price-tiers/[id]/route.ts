import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdminOrSales } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/** PATCH /api/price-tiers/[id] - Update a price tier (admin/sales) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOrSales();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.itemId !== undefined) updates.itemId = String(body.itemId).trim();
    if (body.itemName !== undefined) updates.itemName = String(body.itemName).trim();
    if (body.minQty !== undefined) updates.minQty = Number(body.minQty);
    if (body.unitPrice !== undefined) updates.unitPrice = Number(body.unitPrice);
    if (body.discountPercent !== undefined) updates.discountPercent = Number(body.discountPercent);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const ref = adminDb.collection("priceTiers").doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Price tier not found" }, { status: 404 });
    }

    await ref.update(updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/price-tiers/[id]:", err);
    return NextResponse.json(
      { error: "Failed to update price tier" },
      { status: 500 }
    );
  }
}

/** DELETE /api/price-tiers/[id] - Delete a price tier (admin/sales) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOrSales();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const ref = adminDb.collection("priceTiers").doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Price tier not found" }, { status: 404 });
    }

    await ref.delete();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/price-tiers/[id]:", err);
    return NextResponse.json(
      { error: "Failed to delete price tier" },
      { status: 500 }
    );
  }
}
