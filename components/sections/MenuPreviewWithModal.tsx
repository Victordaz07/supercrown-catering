"use client";

import { useState } from "react";
import Link from "next/link";
import { getMenuBySubcategory } from "@/lib/menu";
import type { MenuItem } from "@/lib/menu";
import { getImagePath } from "@/lib/menuImageMap";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { ProductModal } from "@/components/ui/ProductModal";

/** Displays popular menu items on the homepage; clicking opens the modal. */
export function MenuPreviewWithModal() {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const menuGroups = getMenuBySubcategory();

  // Popular items first; if few, fill with first items from each category
  const popular = menuGroups.flatMap((g) => g.items.filter((i) => i.isPopular));
  const fallback = menuGroups.flatMap((g) => g.items.slice(0, 2));
  const itemsToShow = (popular.length >= 6 ? popular : [...popular, ...fallback])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 6);

  return (
    <section id="menu" className="bg-cream py-16 md:py-24 px-4 sm:px-6 md:px-20 scroll-mt-24 w-full">
      <div className="max-w-7xl mx-auto w-full">
        <SectionHeader
          label="Fresh selections"
          title="Popular menu items"
        />
        <p className="text-muted mb-8 max-w-xl">
          Click on any product to see details and add it to your quote.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {itemsToShow.map((item) => {
            const imagePath = getImagePath(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className="bg-cream hover:bg-warm transition-all p-4 rounded-lg border border-stone/30 text-left hover:shadow-md hover:-translate-y-0.5 cursor-pointer group"
              >
                {imagePath ? (
                  <div className="aspect-[4/3] rounded-sm mb-3 overflow-hidden relative bg-stone/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePath}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="aspect-[4/3] rounded-sm mb-3"
                    style={{ backgroundColor: item.imagePlaceholder }}
                  />
                )}
                <p className="text-terracotta text-xs uppercase tracking-wider mb-1">
                  {item.category}
                </p>
                <h4 className="font-display text-xl text-dark mb-2">{item.name}</h4>
                <p className="text-muted text-sm line-clamp-2 mb-2">{item.shortDescription}</p>
                <span className="text-terracotta text-xs group-hover:underline">
                  View details →
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-12 flex justify-center">
          <Link href="/menu">
            <Button variant="ghost">View full menu</Button>
          </Link>
        </div>
      </div>

      <ProductModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </section>
  );
}
