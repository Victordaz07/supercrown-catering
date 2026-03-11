"use client";

import { Star, Quote } from "lucide-react";
import { reviews } from "@/lib/data";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useScrollReveal } from "@/lib/useScrollReveal";

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-terracotta text-terracotta" />
      ))}
    </div>
  );
}

function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="w-10 h-10 rounded-full bg-terracotta/15 flex items-center justify-center flex-shrink-0">
      <span className="text-terracotta text-sm font-semibold">{initials}</span>
    </div>
  );
}

export function Reviews() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section
      id="reviews"
      className="bg-dark py-20 md:py-28 px-4 sm:px-6 md:px-20 scroll-mt-24 w-full"
    >
      <div className="max-w-7xl mx-auto w-full">
        <SectionHeader
          label="What clients say"
          title="Loved by hundreds of events"
          variant="dark"
        />
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((review, i) => (
            <div
              key={review.id}
              className={`relative bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-2xl p-7 transition-all duration-300 hover:bg-white/[0.1] hover:border-white/15 ${
                i === 1 ? "md:-translate-y-4 md:shadow-2xl" : ""
              }`}
            >
              <Quote className="w-8 h-8 text-terracotta/25 mb-4" />
              <StarRating count={review.rating} />
              <blockquote className="font-display text-warm italic text-xl md:text-2xl mt-4 mb-6 leading-relaxed">
                &ldquo;{review.text}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <AvatarPlaceholder name={review.author} />
                <div>
                  <p className="text-cream text-sm font-medium">
                    {review.author}
                  </p>
                  <p className="text-stone text-xs uppercase tracking-wider">
                    {review.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
