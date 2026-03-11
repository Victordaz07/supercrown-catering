import { NextResponse } from "next/server";
import { requireMasterAdminSales } from "@/lib/auth-server";
import { suggestDeliveryRoute } from "@/lib/delivery-suggester";

type Body = {
  primaryAddress?: string;
  additionalStops?: string[];
  stopsCountHint?: number;
  estimatedMiles?: number | null;
  items?: Array<{ name: string; category?: string; quantity: number }>;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireMasterAdminSales();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Body;
    const primaryAddress = (body.primaryAddress ?? "").trim();
    if (!primaryAddress) {
      return NextResponse.json({ error: "primaryAddress is required" }, { status: 400 });
    }

    const recommendation = suggestDeliveryRoute({
      primaryAddress,
      additionalStops: (body.additionalStops ?? []).filter(Boolean),
      stopsCountHint:
        typeof body.stopsCountHint === "number" && body.stopsCountHint > 0
          ? body.stopsCountHint
          : undefined,
      estimatedMiles:
        typeof body.estimatedMiles === "number" && body.estimatedMiles > 0
          ? body.estimatedMiles
          : null,
      items: (body.items ?? []).map((item) => ({
        name: item.name ?? "",
        category: item.category ?? "",
        quantity: Number(item.quantity) || 0,
      })),
    });

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("POST /api/deliveries/suggest:", error);
    return NextResponse.json({ error: "Failed to suggest route" }, { status: 500 });
  }
}
