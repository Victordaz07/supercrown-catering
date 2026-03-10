/**
 * Migra productos de menuData.json a Firestore (colección products).
 * Ejecutar: npx tsx scripts/seed-products.ts
 *
 * Requiere: .env.local con FIREBASE_ADMIN_*
 */
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

async function main() {
  const { adminDb } = await import("../lib/firebase/admin");
  const menuPath = path.join(__dirname, "..", "lib", "menuData.json");
  const raw = fs.readFileSync(menuPath, "utf-8");
  const items = JSON.parse(raw) as Array<{
    id: string;
    name: string;
    category: string;
    subcategory: string;
    description: string;
    ingredients: string[];
    shortDescription: string;
    calories: number;
    allergens: string[];
    isPopular: boolean;
    isVegetarian: boolean;
    imagePlaceholder: string;
    review: { text: string; author: string; rating: number };
  }>;

  const subcategoryOrder = ["Sandwiches", "Snacks", "Salads"];
  const productsRef = adminDb.collection("products");

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const subIdx = subcategoryOrder.indexOf(item.subcategory);
    const sortOrder = subIdx >= 0 ? subIdx * 100 + i : i;

    const product = {
      ...item,
      isAvailable: true,
      sortOrder,
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await productsRef.doc(item.id).set(product);
    console.log("Migrated:", item.id);
  }

  console.log(`\n✅ ${items.length} productos migrados a Firestore (products)`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
