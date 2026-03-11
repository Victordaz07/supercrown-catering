"use client";

import Link from "next/link";
import { UtensilsCrossed, Plus, Image } from "lucide-react";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-dark">Admin panel</h1>
      <p className="text-muted">
        Manage products, reviews, images and menu availability.
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
              Create, edit, delete and mark products as unavailable
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
            <h2 className="font-display text-lg text-dark">New product</h2>
            <p className="text-sm text-muted">
              Add a new product to the menu
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
              Upload new photos from each product&apos;s edit page
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
