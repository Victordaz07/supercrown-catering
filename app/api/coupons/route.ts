import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export type CouponType = "PERCENTAGE" | "FIXED";

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  minOrder?: number;
  maxUses?: number;
  usedCount: number;
  validUntil?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CouponCreateInput {
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  minOrder?: number;
  maxUses?: number;
  validUntil?: string;
}

/** GET /api/coupons - List all coupons (MASTER/ADMIN only) */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await adminDb
      .collection("coupons")
      .orderBy("createdAt", "desc")
      .get();

    const coupons: Coupon[] = snapshot.docs.map((doc) => {
      const d = doc.data();
      const createdAt = d.createdAt?.toDate?.();
      const updatedAt = d.updatedAt?.toDate?.();
      return {
        id: doc.id,
        code: d.code ?? "",
        description: d.description ?? undefined,
        type: (d.type as CouponType) ?? "FIXED",
        value: Number(d.value) ?? 0,
        minOrder: d.minOrder != null ? Number(d.minOrder) : undefined,
        maxUses: d.maxUses != null ? Number(d.maxUses) : undefined,
        usedCount: Number(d.usedCount) ?? 0,
        validUntil: d.validUntil ? d.validUntil.toDate?.()?.toISOString()?.slice(0, 10) : undefined,
        isActive: d.isActive !== false,
        createdAt: createdAt?.toISOString(),
        updatedAt: updatedAt?.toISOString(),
      };
    });

    return NextResponse.json(coupons);
  } catch (err) {
    console.error("GET /api/coupons:", err);
    return NextResponse.json(
      { error: "Failed to fetch coupons" },
      { status: 500 }
    );
  }
}

/** POST /api/coupons - Create coupon (MASTER/ADMIN only) */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CouponCreateInput;
    const code = (body.code ?? "").trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const existing = await adminDb
      .collection("coupons")
      .where("code", "==", code)
      .limit(1)
      .get();
    if (!existing.empty) {
      return NextResponse.json(
        { error: "A coupon with this code already exists" },
        { status: 400 }
      );
    }

    const validUntil =
      body.validUntil && body.validUntil.trim()
        ? new Date(body.validUntil + "T23:59:59.999Z")
        : undefined;

    const doc = {
      code,
      description: body.description?.trim() || null,
      type: body.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
      value: Number(body.value) ?? 0,
      minOrder: body.minOrder != null ? Number(body.minOrder) : null,
      maxUses: body.maxUses != null ? Number(body.maxUses) : null,
      usedCount: 0,
      validUntil: validUntil ?? null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ref = await adminDb.collection("coupons").add(doc);

    return NextResponse.json({ success: true, id: ref.id });
  } catch (err) {
    console.error("POST /api/coupons:", err);
    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 }
    );
  }
}
