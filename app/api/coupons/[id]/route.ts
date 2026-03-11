import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/auth-server";
import type { CouponType } from "../route";

export const dynamic = "force-dynamic";

export interface CouponUpdateInput {
  code?: string;
  description?: string;
  type?: CouponType;
  value?: number;
  minOrder?: number;
  maxUses?: number;
  validUntil?: string;
  isActive?: boolean;
}

/** PATCH /api/coupons/[id] - Update coupon (MASTER/ADMIN only) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as CouponUpdateInput;

    const docRef = adminDb.collection("coupons").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.code !== undefined) {
      updates.code = body.code.trim().toUpperCase();
    }
    if (body.description !== undefined) {
      updates.description = body.description?.trim() || null;
    }
    if (body.type !== undefined) {
      updates.type = body.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
    }
    if (body.value !== undefined) {
      updates.value = Number(body.value);
    }
    if (body.minOrder !== undefined) {
      updates.minOrder = body.minOrder != null ? Number(body.minOrder) : null;
    }
    if (body.maxUses !== undefined) {
      updates.maxUses = body.maxUses != null ? Number(body.maxUses) : null;
    }
    if (body.validUntil !== undefined) {
      updates.validUntil =
        body.validUntil && body.validUntil.trim()
          ? new Date(body.validUntil + "T23:59:59.999Z")
          : null;
    }
    if (body.isActive !== undefined) {
      updates.isActive = Boolean(body.isActive);
    }

    await docRef.update(updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/coupons/[id]:", err);
    return NextResponse.json(
      { error: "Failed to update coupon" },
      { status: 500 }
    );
  }
}

/** DELETE /api/coupons/[id] - Delete coupon (only if usedCount === 0) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const docRef = adminDb.collection("coupons").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const usedCount = Number(doc.data()?.usedCount ?? 0);
    if (usedCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete coupon that has been used" },
        { status: 400 }
      );
    }

    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/coupons/[id]:", err);
    return NextResponse.json(
      { error: "Failed to delete coupon" },
      { status: 500 }
    );
  }
}
