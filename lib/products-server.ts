import { adminDb } from "@/lib/firebase/admin";
import type { Product } from "@/lib/product-types";

const subcategoryOrder = ["Sandwiches", "Snacks", "Salads"];

/** Obtiene productos desde Firestore (solo disponibles). Para uso en servidor. */
export async function getProductsFromFirestore(includeUnavailable = false): Promise<Product[]> {
  const snapshot = await adminDb
    .collection("products")
    .orderBy("subcategory")
    .orderBy("sortOrder")
    .get();

  const products: Product[] = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      ...d,
      createdAt: d.createdAt?.toDate?.(),
      updatedAt: d.updatedAt?.toDate?.(),
    } as Product;
  });

  if (includeUnavailable) return products;
  return products.filter((p) => p.isAvailable !== false);
}

/** Agrupa productos por subcategoría en el orden definido */
export function groupProductsBySubcategory(products: Product[]) {
  const bySub = new Map<string, Product[]>();
  for (const p of products) {
    const arr = bySub.get(p.subcategory) ?? [];
    arr.push(p);
    bySub.set(p.subcategory, arr);
  }
  return subcategoryOrder
    .filter((sub) => bySub.has(sub))
    .map((sub) => ({ subcategory: sub, items: bySub.get(sub) ?? [] }));
}
