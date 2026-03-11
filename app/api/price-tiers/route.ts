import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdminOrSales } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export interface PriceTier {
  id: string;
  itemId: string;
  itemName: string;
  minQty: number;
  unitPrice: number;
  discountPercent: number;
}

/** GET /api/price-tiers - List all price tiers (admin/sales) */
export async function GET() {
  try {
    await requireAdminOrSales();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await adminDb.collection("priceTiers").get();

    const tiers: PriceTier[] = snapshot.docs
      .map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        itemId: d.itemId ?? "",
        itemName: d.itemName ?? "",
        minQty: Number(d.minQty) ?? 0,
        unitPrice: Number(d.unitPrice) ?? 0,
        discountPercent: Number(d.discountPercent) ?? 0,
      };
    })
      .sort((a, b) => {
        const nameCmp = a.itemName.localeCompare(b.itemName);
        return nameCmp !== 0 ? nameCmp : a.minQty - b.minQty;
      });

    return NextResponse.json(tiers);
  } catch (err) {
    console.error("GET /api/price-tiers:", err);
    return NextResponse.json(
      { error: "Failed to fetch price tiers" },
      { status: 500 }
    );
  }
}

/** POST /api/price-tiers - Create a price tier (admin/sales) */
export async function POST(request: Request) {
  try {
    await requireAdminOrSales();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const itemId = String(body.itemId ?? "").trim();
    const itemName = String(body.itemName ?? "").trim();
    const minQty = Number(body.minQty) ?? 0;
    const unitPrice = Number(body.unitPrice) ?? 0;
    const discountPercent = Number(body.discountPercent) ?? 0;

    if (!itemId || !itemName) {
      return NextResponse.json(
        { error: "itemId and itemName are required" },
        { status: 400 }
      );
    }

    const doc = {
      itemId,
      itemName,
      minQty,
      unitPrice,
      discountPercent,
    };

    const ref = await adminDb.collection("priceTiers").add(doc);

    return NextResponse.json({ success: true, id: ref.id });
  } catch (err) {
    console.error("POST /api/price-tiers:", err);
    return NextResponse.json(
      { error: "Failed to create price tier" },
      { status: 500 }
    );
  }
}
