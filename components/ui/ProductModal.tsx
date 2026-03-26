"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Flame, Minus, Plus, X, ShoppingBag, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import type { MenuItem } from "@/lib/menu";
import { getImagePath } from "@/lib/menuImageMap";
import { useCart } from "@/lib/cartStore";

interface ProductModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

function buildImageList(item: MenuItem & { imageUrl?: string | null; galleryUrls?: string[] }): string[] {
  const primary = item.imageUrl || getImagePath(item.id);
  const list: string[] = [];
  if (primary) list.push(primary);
  for (const u of item.galleryUrls || []) {
    if (u && !list.includes(u)) list.push(u);
  }
  return list;
}

export function ProductModal({ item, onClose }: ProductModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(5);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const images = useMemo(
    () => (item ? buildImageList(item as MenuItem & { imageUrl?: string | null; galleryUrls?: string[] }) : []),
    [item]
  );

  const activeSrc = images[activeIndex] ?? null;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (lightboxOpen) setLightboxOpen(false);
      else onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen || images.length <= 1) return;
    const handleArrows = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + images.length) % images.length);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % images.length);
      }
    };
    document.addEventListener("keydown", handleArrows);
    return () => document.removeEventListener("keydown", handleArrows);
  }, [lightboxOpen, images.length]);

  useEffect(() => {
    if (item) {
      document.body.style.overflow = "hidden";
      setQuantity(5);
      setActiveIndex(0);
      setLightboxOpen(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [item]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  if (!item) return null;

  const hasMultiple = images.length > 1;

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
    <>
      <div
        className="fixed inset-0 z-[150] bg-dark/50 backdrop-blur-lg flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          className="bg-cream max-w-6xl w-full max-h-[95vh] rounded-2xl shadow-2xl border border-stone/20 relative animate-modal-in overflow-hidden flex flex-col md:flex-row"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 p-2.5 rounded-full bg-cream/95 hover:bg-warm text-muted hover:text-dark hover:rotate-90 transition-all duration-300 shadow-sm border border-stone/15"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Left — large gallery */}
          <div className="w-full md:w-[52%] bg-warm flex flex-col md:min-h-[min(92vh,880px)] shrink-0 border-b md:border-b-0 md:border-r border-stone/15">
            <div className="relative flex-1 min-h-[min(52vh,480px)] md:min-h-[360px] bg-dark/5">
              {activeSrc ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeSrc}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setLightboxOpen(true)}
                  />
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="absolute top-3 left-3 z-10 p-2 rounded-full bg-cream/90 text-dark/70 hover:text-dark shadow-sm border border-stone/15 opacity-90 hover:opacity-100 transition-opacity"
                    aria-label="View larger"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </>
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

              {hasMultiple && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goPrev();
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-cream/95 shadow-md border border-stone/20 text-dark hover:bg-cream"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goNext();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-cream/95 shadow-md border border-stone/20 text-dark hover:bg-cream"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              <div
                className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-dark/40 to-transparent pointer-events-none"
                aria-hidden
              />

              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
                {item.isPopular && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-cream/95 text-terracotta shadow-sm border border-terracotta/15">
                    Popular
                  </span>
                )}
                {item.isVegetarian && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-cream/95 text-olive shadow-sm border border-olive/15">
                    Vegetarian
                  </span>
                )}
              </div>
            </div>

            {hasMultiple && (
              <div className="shrink-0 px-2 py-3 border-t border-stone/20 bg-warm/80">
                <p className="text-[10px] uppercase tracking-wider text-muted text-center mb-2">Photos</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin justify-center md:justify-start px-1">
                  {images.map((src, idx) => (
                    <button
                      key={`${src}-${idx}`}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === activeIndex
                          ? "border-terracotta ring-2 ring-terracotta/30 scale-[1.02]"
                          : "border-transparent opacity-75 hover:opacity-100"
                      }`}
                      aria-label={`Photo ${idx + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — content */}
          <div className="w-full md:w-[48%] p-5 sm:p-7 md:p-8 flex flex-col flex-1 min-w-0 overflow-y-auto max-h-[50vh] md:max-h-none pt-14 md:pt-8">
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

            {item.ingredients.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {item.ingredients.map((ing) => (
                  <span
                    key={ing}
                    className="px-3 py-1.5 text-xs rounded-full bg-warm border border-stone/20 text-dark/85"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted mb-5 py-2.5 px-4 rounded-xl bg-warm/60 w-fit">
              <Flame className="w-4 h-4 text-terracotta flex-shrink-0" />
              <span>{item.calories} cal approx</span>
              {item.allergens.length > 0 && (
                <span className="text-muted/80">
                  · {item.allergens.join(", ")}
                </span>
              )}
            </div>

            <div className="relative pl-5 py-4 mb-6 border-l-2 border-terracotta/40 bg-warm/30 rounded-r-xl">
              <div className="flex gap-0.5 text-terracotta mb-2">
                {Array.from({ length: item.review.rating }).map((_, i) => (
                  <span key={i} className="text-sm">&#9733;</span>
                ))}
              </div>
              <p className="font-display italic text-dark text-lg mb-2 leading-relaxed">
                &ldquo;{item.review.text}&rdquo;
              </p>
              <p className="text-muted text-xs uppercase tracking-wider">
                — {item.review.author}
              </p>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm text-muted uppercase tracking-wider">
                Minimum quantity
              </span>
              <div className="flex items-center gap-0.5 border border-stone/30 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(5, q - 5))}
                  className="w-11 h-11 flex items-center justify-center hover:bg-warm active:bg-stone/20 transition-colors text-dark"
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
                  className="w-11 h-11 flex items-center justify-center hover:bg-warm active:bg-stone/20 transition-colors text-dark"
                  aria-label="More"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={handleAddToQuote}
              className="w-full bg-terracotta text-white py-4 px-6 uppercase tracking-[0.12em] font-medium hover:bg-terracotta/90 hover:shadow-xl active:scale-[0.98] transition-all duration-300 rounded-xl flex items-center justify-center gap-2.5 group"
            >
              <ShoppingBag className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
              Add to my quote
            </button>
            <p className="text-muted/80 text-xs text-center mt-4">
              We&apos;ll confirm the price based on your quantity
            </p>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && activeSrc && (
        <div
          className="fixed inset-0 z-[200] bg-black/92 flex flex-col items-center justify-center p-4"
          role="presentation"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          {hasMultiple && (
            <>
              <button
                type="button"
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label="Previous"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                type="button"
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label="Next"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeSrc}
            alt={item.name}
            className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {hasMultiple && (
            <p className="mt-4 text-white/70 text-sm">
              {activeIndex + 1} / {images.length}
            </p>
          )}
        </div>
      )}
    </>
  );
}
