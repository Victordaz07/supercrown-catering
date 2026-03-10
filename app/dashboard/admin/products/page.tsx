"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Loader2,
} from "lucide-react";
import type { Product } from "@/lib/product-types";
import { getImagePath } from "@/lib/menuImageMap";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeUnavailable, setIncludeUnavailable] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/products?includeUnavailable=${includeUnavailable}`)
      .then((r) => r.json())
      .then((data: Product[]) => setProducts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [includeUnavailable]);

  const toggleAvailability = async (p: Product) => {
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !p.isAvailable }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((x) =>
            x.id === p.id ? { ...x, isAvailable: !x.isAvailable } : x
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("¿Eliminar este producto permanentemente?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((x) => x.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || "Error al eliminar");
      }
    } catch (e) {
      console.error(e);
      alert("Error al eliminar");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-display text-2xl text-dark">Productos</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={includeUnavailable}
              onChange={(e) => setIncludeUnavailable(e.target.checked)}
              className="rounded border-stone"
            />
            Mostrar no disponibles
          </label>
          <Link
            href="/dashboard/admin/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => {
          const imagePath = p.imageUrl || getImagePath(p.id);
          return (
            <div
              key={p.id}
              className={`rounded-lg border overflow-hidden transition-all ${
                !p.isAvailable ? "opacity-60 border-amber-200" : "border-stone/30"
              }`}
            >
              <div className="aspect-[16/10] relative bg-warm">
                {imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePath}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: p.imagePlaceholder }}
                  >
                    <span className="text-dark/80 text-sm px-2">{p.name}</span>
                  </div>
                )}
                {!p.isAvailable && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded">
                    No disponible
                  </span>
                )}
              </div>
              <div className="p-4 bg-cream">
                <h3 className="font-display text-lg text-dark truncate">
                  {p.name}
                </h3>
                <p className="text-xs text-muted mb-3">
                  {p.category} · {p.subcategory}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/dashboard/admin/products/${p.id}/edit`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-terracotta/20 text-terracotta rounded hover:bg-terracotta/30 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleAvailability(p)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-stone/30 text-dark rounded hover:bg-stone/40 transition-colors"
                    title={p.isAvailable ? "Ocultar temporalmente" : "Mostrar"}
                  >
                    {p.isAvailable ? (
                      <EyeOff className="w-3 h-3" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                    {p.isAvailable ? "Ocultar" : "Mostrar"}
                  </button>
                  <Link
                    href={`/dashboard/admin/products/${p.id}/edit#upload`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-stone/30 text-dark rounded hover:bg-stone/40 transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    Foto
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteProduct(p.id)}
                    disabled={deleting === p.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                  >
                    {deleting === p.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-muted">
          <p>No hay productos</p>
          <Link
            href="/dashboard/admin/products/new"
            className="mt-2 inline-block text-terracotta hover:underline"
          >
            Crear el primer producto
          </Link>
        </div>
      )}
    </div>
  );
}
