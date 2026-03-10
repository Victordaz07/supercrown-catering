import menuData from "./menuData.json";

export interface MenuItemReview {
  text: string;
  author: string;
  rating: number;
}

export interface MenuItem {
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
  /** URL de imagen en Storage (prioridad sobre menuImageMap) */
  imageUrl?: string | null;
  review: MenuItemReview;
}

export interface CartItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  calories: number;
}

export interface MenuGroup {
  subcategory: string;
  items: MenuItem[];
}

const menuItems = menuData as MenuItem[];

const subcategoryOrder = ["Sandwiches", "Snacks", "Salads"];

export function getMenuBySubcategory(): MenuGroup[] {
  const bySubcategory = new Map<string, MenuItem[]>();

  for (const item of menuItems) {
    const existing = bySubcategory.get(item.subcategory) ?? [];
    existing.push(item);
    bySubcategory.set(item.subcategory, existing);
  }

  return subcategoryOrder
    .filter((sub) => bySubcategory.has(sub))
    .map((sub) => ({
      subcategory: sub,
      items: bySubcategory.get(sub) ?? [],
    }));
}
