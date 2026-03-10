"use client";

import Link from "next/link";
import { UtensilsCrossed, Plus, Image } from "lucide-react";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-dark">Panel de administración</h1>
      <p className="text-muted">
        Gestiona productos, reseñas, imágenes y disponibilidad del menú.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/admin/products"
          className="flex items-center gap-4 rounded-lg border border-stone/30 bg-cream p-6 hover:shadow-md hover:border-terracotta/30 transition-all"
        >
          <div className="w-12 h-12 rounded-lg bg-terracotta/20 flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 text-terracotta" />
          </div>
          <div>
            <h2 className="font-display text-lg text-dark">Productos</h2>
            <p className="text-sm text-muted">
              Crear, editar, eliminar y marcar productos como no disponibles
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/admin/products/new"
          className="flex items-center gap-4 rounded-lg border border-stone/30 bg-cream p-6 hover:shadow-md hover:border-terracotta/30 transition-all"
        >
          <div className="w-12 h-12 rounded-lg bg-terracotta/20 flex items-center justify-center">
            <Plus className="w-6 h-6 text-terracotta" />
          </div>
          <div>
            <h2 className="font-display text-lg text-dark">Nuevo producto</h2>
            <p className="text-sm text-muted">
              Agregar un nuevo producto al menú
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/admin/products"
          className="flex items-center gap-4 rounded-lg border border-stone/30 bg-cream p-6 hover:shadow-md hover:border-terracotta/30 transition-all"
        >
          <div className="w-12 h-12 rounded-lg bg-terracotta/20 flex items-center justify-center">
            <Image className="w-6 h-6 text-terracotta" />
          </div>
          <div>
            <h2 className="font-display text-lg text-dark">Imágenes</h2>
            <p className="text-sm text-muted">
              Sube nuevas fotos desde la edición de cada producto
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
