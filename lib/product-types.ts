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
  /** URL de imagen en Firebase Storage (prioridad sobre menuImageMap) */
  imageUrl?: string | null;
  /** Si false, no se muestra en el menú público */
  isAvailable: boolean;
  /** Orden dentro de la subcategoría */
  sortOrder: number;
  review: ProductReview;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ProductCreateInput = Omit<Product, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type ProductUpdateInput = Partial<Omit<Product, "id" | "createdAt">>;
