import type { Metadata } from "next";
import { MenuContent } from "@/components/sections/MenuContent";
import { getProductsFromFirestore, groupProductsBySubcategory } from "@/lib/products-server";
import { getMenuBySubcategory } from "@/lib/menu";
import type { MenuItem } from "@/lib/menu";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Menu | Super Crown Catering",
  description:
    "Browse our fresh box lunches, grab-and-go items, and salads.",
};

export default async function MenuPage() {
  let menuGroups: { subcategory: string; items: MenuItem[] }[];

  try {
    const products = await getProductsFromFirestore(false);
    if (products.length > 0) {
      menuGroups = groupProductsBySubcategory(products).map((g) => ({
        subcategory: g.subcategory,
        items: g.items as unknown as MenuItem[],
      }));
    } else {
      menuGroups = getMenuBySubcategory();
    }
  } catch {
    menuGroups = getMenuBySubcategory();
  }

  return <MenuContent menuGroups={menuGroups} />;
}
