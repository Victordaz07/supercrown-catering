export interface ProductReview {
  text: string;
  author: string;
  rating: number;
}

export interface Product {
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
  /** Image URL in Firebase Storage (takes priority over menuImageMap) */
  imageUrl?: string | null;
  /** If false, item is not shown on the public menu */
  isAvailable: boolean;
  /** Order within the subcategory */
  sortOrder: number;
  review: ProductReview;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ProductCreateInput = Omit<Product, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type ProductUpdateInput = Partial<Omit<Product, "id" | "createdAt">>;
