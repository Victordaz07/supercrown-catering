"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { getMenuBySubcategory } from "@/lib/menu";
import type { MenuItem, MenuGroup } from "@/lib/menu";
import { getImagePath } from "@/lib/menuImageMap";
import { useCart } from "@/lib/cartStore";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProductModal } from "@/components/ui/ProductModal";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const subcategoryOrder = ["Sandwiches", "Snacks", "Salads"];

function parseJsonSafe(str: string): string[] {
  try { return JSON.parse(str); } catch { return []; }
}

export function MenuContent() {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { totalItems } = useCart();
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    let cancelled = false;
    async function loadProducts() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("API error");
        const products = await res.json();
        if (cancelled) return;

        if (Array.isArray(products) && products.length > 0) {
          const items: MenuItem[] = products.map((p: Record<string, unknown>) => ({
            id: p.slug as string || p.id as string,
            name: p.name as string,
            category: p.category as string,
            subcategory: p.subcategory as string,
            description: p.description as string,
            shortDescription: p.shortDescription as string,
            ingredients: typeof p.ingredients === "string" ? parseJsonSafe(p.ingredients as string) : (p.ingredients as string[]) || [],
            calories: (p.calories as number) || 0,
            allergens: typeof p.allergens === "string" ? parseJsonSafe(p.allergens as string) : (p.allergens as string[]) || [],
            isPopular: Boolean(p.isPopular),
            isVegetarian: Boolean(p.isVegetarian),
            imagePlaceholder: (p.imagePlaceholder as string) || "#C9A07A",
            imageUrl: (p.imageUrl as string) || null,
            review: {
              text: (p.reviewText as string) || "",
              author: (p.reviewAuthor as string) || "",
              rating: (p.reviewRating as number) || 5,
            },
          }));

          const bySubcategory = new Map<string, MenuItem[]>();
          for (const item of items) {
            const existing = bySubcategory.get(item.subcategory) ?? [];
            existing.push(item);
            bySubcategory.set(item.subcategory, existing);
          }

          const groups = subcategoryOrder
            .filter((sub) => bySubcategory.has(sub))
            .map((sub) => ({ subcategory: sub, items: bySubcategory.get(sub) ?? [] }));

          setMenuGroups(groups);
          setLoaded(true);
          return;
        }
      } catch { /* fallback */ }

      if (!cancelled) {
        setMenuGroups(getMenuBySubcategory());
        setLoaded(true);
      }
    }
    loadProducts();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (menuGroups.length > 0 && !activeCategory) {
      setActiveCategory(menuGroups[0].subcategory);
    }
  }, [menuGroups, activeCategory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.getAttribute("data-category") || "");
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [menuGroups]);

  const scrollToCategory = (subcategory: string) => {
    const el = sectionRefs.current.get(subcategory);
    if (el) {
      const offset = 160;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <main className="min-h-screen bg-cream flex flex-col">
      <Navbar />

      <div className="pt-24 pb-20 px-4 sm:px-6 md:px-20 max-w-7xl mx-auto w-full">
        <SectionHeader label="Our Menu" title="Fresh selections" />

        {!loaded && (
          <div className="text-center py-12 text-muted">Loading menu...</div>
        )}

        {loaded && menuGroups.length > 0 && (
          <>
            {/* Sticky category pills */}
            <div className="sticky top-[60px] z-30 bg-cream/90 backdrop-blur-md py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-20 md:px-20 border-b border-stone/15 mb-8">
              <div className="max-w-7xl mx-auto overflow-x-auto scrollbar-none">
                <div className="flex gap-2 min-w-max">
                  {menuGroups.map((group) => (
                    <button
                      key={group.subcategory}
                      type="button"
                      onClick={() => scrollToCategory(group.subcategory)}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                        activeCategory === group.subcategory
                          ? "bg-dark text-cream shadow-md"
                          : "bg-warm text-muted hover:bg-stone/30 hover:text-dark"
                      }`}
                    >
                      {group.subcategory}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {menuGroups.map((group) => (
              <section
                key={group.subcategory}
                ref={(el) => {
                  if (el) sectionRefs.current.set(group.subcategory, el);
                }}
                data-category={group.subcategory}
                className="mt-12 first:mt-0 scroll-mt-40"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-px bg-terracotta flex-shrink-0" />
                  <h2 className="font-display text-2xl text-dark">
                    {group.subcategory}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.items.map((item) => {
                    const imageSrc = (item as MenuItem & { imageUrl?: string | null }).imageUrl || getImagePath(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="bg-cream rounded-2xl border border-stone/20 overflow-hidden text-left hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-pointer group"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden">
                          {imageSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageSrc}
                              alt={item.name}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
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
                          <div
                            className="absolute inset-0 bg-gradient-to-t from-dark/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            aria-hidden
                          />
                          <div className="absolute top-3 left-3 flex gap-1.5">
                            {item.isPopular && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-cream/95 text-terracotta shadow-sm">
                                Popular
                              </span>
                            )}
                            {item.isVegetarian && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-cream/95 text-olive shadow-sm">
                                Vegetarian
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-5">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider bg-terracotta/8 text-terracotta mb-2">
                            {item.category}
                          </span>
                          <h3 className="font-display text-xl text-dark mb-2 leading-tight">
                            {item.name}
                          </h3>
                          <p className="text-muted text-sm line-clamp-2 mb-3">
                            {item.shortDescription}
                          </p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted">{item.calories} cal</span>
                            <span className="inline-flex items-center gap-1 text-terracotta text-xs font-medium">
                              View details
                              <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        )}
      </div>

      {totalItems > 0 && (
        <Link
          href="/#quote"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-dark text-cream rounded-2xl shadow-xl flex items-center justify-center hover:bg-dark/90 hover:shadow-2xl hover:scale-105 transition-all duration-300"
          aria-label={`View quote with ${totalItems} items`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-terracotta text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm animate-scale-in">
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
