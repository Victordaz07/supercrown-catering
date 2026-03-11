import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/auth-server";
import type { Product, ProductCreateInput } from "@/lib/product-types";

export const dynamic = "force-dynamic";

/** GET /api/products - Lists products (public). Returns only isAvailable: true if not admin. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeUnavailable = searchParams.get("includeUnavailable") === "true";

    let isAdmin = false;
    try {
      await requireAdmin();
      isAdmin = true;
    } catch {
      // Not admin, only available products
    }

    const snapshot = await adminDb
      .collection("products")
      .orderBy("subcategory")
      .orderBy("sortOrder")
      .get();

    const products: Product[] = snapshot.docs.map((doc) => {
      const d = doc.data();
      const createdAt = d.createdAt?.toDate?.();
      const updatedAt = d.updatedAt?.toDate?.();
      return {
        id: doc.id,
        ...d,
        createdAt,
        updatedAt,
      } as Product;
    });

    const filtered = isAdmin && includeUnavailable
      ? products
      : products.filter((p) => p.isAvailable !== false);

    return NextResponse.json(filtered);
  } catch (err) {
    console.error("GET /api/products:", err);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

/** POST /api/products - Crear producto (admin) */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ProductCreateInput;
    const id = body.id || body.name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `product-${Date.now()}`;

    const product = {
      name: body.name ?? "",
      category: body.category ?? "Box Lunch",
      subcategory: body.subcategory ?? "Sandwiches",
      description: body.description ?? "",
      ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
      shortDescription: body.shortDescription ?? body.name ?? "",
      calories: Number(body.calories) || 0,
      allergens: Array.isArray(body.allergens) ? body.allergens : [],
      isPopular: Boolean(body.isPopular),
      isVegetarian: Boolean(body.isVegetarian),
      imagePlaceholder: body.imagePlaceholder ?? "#C9A07A",
      imageUrl: body.imageUrl ?? null,
      isAvailable: body.isAvailable !== false,
      sortOrder: Number(body.sortOrder) ?? 0,
      review: body.review ?? { text: "", author: "", rating: 5 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await adminDb.collection("products").doc(id).set(product);

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("POST /api/products:", err);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
