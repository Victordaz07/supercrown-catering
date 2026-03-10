"use client";

import { useEffect, useState } from "react";
import { Flame, Minus, Plus, X, ShoppingBag } from "lucide-react";
import type { MenuItem } from "@/lib/menu";
import { getImagePath } from "@/lib/menuImageMap";
import { useCart } from "@/lib/cartStore";

interface ProductModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

export function ProductModal({ item, onClose }: ProductModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(10);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (item) {
      document.body.style.overflow = "hidden";
      setQuantity(10);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [item]);

  if (!item) return null;

  const imagePath = item.imageUrl || getImagePath(item.id);

  const handleAddToQuote = () => {
    addItem({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity,
      calories: item.calories,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[150] bg-dark/60 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-cream max-w-3xl w-full max-h-[90vh] rounded-lg shadow-2xl border border-stone/30 relative animate-modal-in overflow-y-auto flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - fixed over scroll */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-cream/90 hover:bg-warm text-muted hover:text-dark transition-colors shadow-sm border border-stone/20"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left panel - image */}
        <div className="w-full md:w-2/5 bg-warm flex-shrink-0">
          <div className="relative aspect-[4/3] overflow-hidden">
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
                <span className="font-display text-xl text-dark/80 text-center px-4">
                  {item.name}
                </span>
              </div>
            )}
            {/* Soft overlay gradient */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-dark/40 via-transparent to-transparent pointer-events-none"
              aria-hidden
            />
            {/* Badges on image */}
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
              {item.isPopular && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-cream/95 text-terracotta shadow-sm border border-terracotta/20">
                  ★ Popular
                </span>
              )}
              {item.isVegetarian && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-cream/95 text-olive shadow-sm border border-olive/20">
                  🌿 Vegetarian
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right panel - content */}
        <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col flex-1 min-w-0 pt-14 md:pt-8">
          {/* Header with terracotta line */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-px bg-terracotta flex-shrink-0" />
            <p className="text-terracotta text-xs uppercase tracking-[0.2em] font-medium">
              {item.category}
            </p>
          </div>
          <h2
            id="modal-title"
            className="font-display text-3xl md:text-4xl text-dark mb-4 font-light leading-tight"
          >
            {item.name}
          </h2>
          <p className="text-muted leading-relaxed mb-5 text-[15px]">
            {item.description}
          </p>

          {/* Ingredients */}
          {item.ingredients.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {item.ingredients.map((ing) => (
                <span
                  key={ing}
                  className="px-3 py-1.5 text-xs rounded-full bg-warm/80 border border-stone/30 text-dark/90"
                >
                  {ing}
                </span>
              ))}
            </div>
          )}

          {/* Calories and allergens */}
          <div className="flex items-center gap-2 text-sm text-muted mb-5 py-2 px-3 rounded-lg bg-warm/50 w-fit">
            <Flame className="w-4 h-4 text-terracotta flex-shrink-0" />
            <span>{item.calories} cal approx</span>
            {item.allergens.length > 0 && (
              <span className="text-muted/80">
                · {item.allergens.join(", ")}
              </span>
            )}
          </div>

          {/* Review */}
          <div className="relative pl-5 py-4 mb-6 border-l-2 border-terracotta bg-warm/30 rounded-r-lg">
            <span className="absolute -left-0.5 top-4 text-terracotta/50 font-display text-2xl leading-none">&ldquo;</span>
            <div className="flex gap-1 text-terracotta mb-2">
              {Array.from({ length: item.review.rating }).map((_, i) => (
                <span key={i} className="text-sm">★</span>
              ))}
            </div>
            <p className="font-display italic text-dark text-lg mb-2 leading-relaxed">
              {item.review.text}
            </p>
            <p className="text-muted text-xs uppercase tracking-wider">
              — {item.review.author}
            </p>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm text-muted uppercase tracking-wider">Minimum quantity</span>
            <div className="flex items-center gap-1 border border-stone rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(10, q - 5))}
                className="w-11 h-11 flex items-center justify-center hover:bg-warm transition-colors text-dark"
                aria-label="Less"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-display font-semibold text-dark text-lg min-w-[3rem] text-center bg-cream px-2">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 5)}
                className="w-11 h-11 flex items-center justify-center hover:bg-warm transition-colors text-dark"
                aria-label="More"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleAddToQuote}
            className="w-full bg-terracotta text-white py-4 px-6 uppercase tracking-[0.15em] font-medium hover:bg-terracotta/90 active:scale-[0.99] transition-all rounded-lg flex items-center justify-center gap-2 shadow-lg"
          >
            <ShoppingBag className="w-5 h-5" />
            Add to my quote
          </button>
          <p className="text-muted/90 text-xs text-center mt-4">
            We&apos;ll confirm the price based on your quantity
          </p>
        </div>
      </div>
    </div>
  );
}
