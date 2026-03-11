import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/auth-server";
import type { Product, ProductUpdateInput } from "@/lib/product-types";

export const dynamic = "force-dynamic";

/** GET /api/products/[id] - Get a product (public) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await adminDb.collection("products").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const d = doc.data()!;
    const product: Product = {
      id: doc.id,
      ...d,
      createdAt: d.createdAt?.toDate?.(),
      updatedAt: d.updatedAt?.toDate?.(),
    } as Product;
    return NextResponse.json(product);
  } catch (err) {
    console.error("GET /api/products/[id]:", err);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

/** PATCH /api/products/[id] - Actualizar producto (admin) */
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
    const body = (await request.json()) as ProductUpdateInput;

    const docRef = adminDb.collection("products").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    const allowed: (keyof ProductUpdateInput)[] = [
      "name", "category", "subcategory", "description", "ingredients",
      "shortDescription", "calories", "allergens", "isPopular", "isVegetarian",
      "imagePlaceholder", "imageUrl", "isAvailable", "sortOrder", "review",
    ];

    for (const key of allowed) {
      const val = body[key];
      if (val !== undefined) {
        (updates as Record<string, unknown>)[key] = val;
      }
    }

    await docRef.update(updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/products/[id]:", err);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

/** DELETE /api/products/[id] - Eliminar producto (admin) */
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
    const docRef = adminDb.collection("products").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/products/[id]:", err);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
