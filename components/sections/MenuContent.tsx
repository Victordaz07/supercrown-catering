"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getMenuBySubcategory } from "@/lib/menu";
import type { MenuItem } from "@/lib/menu";
import { getImagePath } from "@/lib/menuImageMap";
import { useCart } from "@/lib/cartStore";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProductModal } from "@/components/ui/ProductModal";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

interface MenuContentProps {
  menuGroups?: { subcategory: string; items: MenuItem[] }[];
}

export function MenuContent({ menuGroups: propGroups }: MenuContentProps = {}) {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const { totalItems } = useCart();
  const menuGroups = propGroups ?? getMenuBySubcategory();

  return (
    <main className="min-h-screen bg-cream flex flex-col">
      <Navbar />
      <div className="pt-24 pb-20 px-4 sm:px-6 md:px-20 max-w-7xl mx-auto">
        <SectionHeader label="Our Menu" title="Fresh selections" />

        {menuGroups.map((group) => (
          <section key={group.subcategory} className="mt-12 first:mt-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-px bg-terracotta flex-shrink-0" />
              <h2 className="font-display text-2xl text-dark">
                {group.subcategory}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {group.items.map((item) => {
                const imagePath = item.imageUrl || getImagePath(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="bg-cream border border-stone/30 rounded-sm overflow-hidden text-left hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                  >
                    <div className="aspect-[16/10] relative">
                      {imagePath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imagePath}
                          alt={item.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ backgroundColor: item.imagePlaceholder }}
                        >
                          <span className="font-display text-lg text-dark/80 text-center px-4">
                            {item.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-terracotta text-xs uppercase tracking-wider mb-1">
                        {item.category}
                      </p>
                      <h3 className="font-display text-xl text-dark mb-2">
                        {item.name}
                      </h3>
                      <p className="text-muted text-sm line-clamp-2 mb-3">
                        {item.shortDescription}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">{item.calories} cal</span>
                        <span className="text-terracotta text-xs group-hover:underline">
                          View details →
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Floating cart button */}
      {totalItems > 0 && (
        <Link
          href="/#quote"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-dark text-cream rounded-full shadow-lg flex items-center justify-center hover:bg-dark/90 transition-colors"
          aria-label={`View quote with ${totalItems} items`}
        >
          <ShoppingBag className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-terracotta text-white text-xs font-bold rounded-full flex items-center justify-center">
            {totalItems}
          </span>
        </Link>
      )}

      <Footer />

      <ProductModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </main>
  );
}
