import { trustItems } from "@/lib/data";
import { Heart, Leaf, Clock, Sliders, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const trustIcons: LucideIcon[] = [Heart, Leaf, Clock, Sliders, Building2];

export function TrustBar() {
  const items = trustItems.map((item, i) => ({
    label: item,
    Icon: trustIcons[i % trustIcons.length],
  }));

  return (
    <section className="bg-gradient-to-b from-dark to-dark/95 py-5 px-4 sm:px-6 md:px-20 overflow-hidden w-full">
      {/* Desktop: static with dividers */}
      <div className="hidden md:flex max-w-7xl mx-auto justify-between items-center w-full">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-3">
            {i > 0 && (
              <div className="w-px h-4 bg-stone/25 mr-4" aria-hidden />
            )}
            <item.Icon className="w-4 h-4 text-terracotta flex-shrink-0" />
            <span className="text-stone text-sm uppercase tracking-wider whitespace-nowrap">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Mobile: infinite marquee */}
      <div className="md:hidden relative">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...items, ...items].map((item, i) => (
            <div key={i} className="flex items-center gap-2 mx-6 flex-shrink-0">
              <item.Icon className="w-3.5 h-3.5 text-terracotta flex-shrink-0" />
              <span className="text-stone text-xs uppercase tracking-wider">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
