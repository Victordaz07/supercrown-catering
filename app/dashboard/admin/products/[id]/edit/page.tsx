"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import type { Product } from "@/lib/product-types";
import { Loader2 } from "lucide-react";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setProduct)
      .catch(() => setProduct(null));
  }, [id]);

  if (product === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Producto no encontrado</p>
        <button
          onClick={() => router.push("/dashboard/admin/products")}
          className="mt-2 text-terracotta hover:underline"
        >
          Volver a productos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-dark">Editar: {product.name}</h1>
      <ProductForm
        product={product}
        onSuccess={() => router.push("/dashboard/admin/products")}
        onCancel={() => router.back()}
      />
    </div>
  );
}
