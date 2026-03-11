"use client";

import { useRouter } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-dark">New product</h1>
      <ProductForm
        product={null}
        onSuccess={() => router.push("/dashboard/admin/products")}
        onCancel={() => router.back()}
      />
    </div>
  );
}
