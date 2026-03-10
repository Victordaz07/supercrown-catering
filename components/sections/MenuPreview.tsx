import { menuCategories } from "@/lib/data";
import { themeColors } from "@/lib/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function MenuPreview() {
  return (
    <section id="menu" className="bg-cream py-16 md:py-24 px-4 sm:px-6 md:px-20 scroll-mt-24 w-full">
      <div className="max-w-7xl mx-auto w-full">
        <SectionHeader
          label="Fresh selections"
          title="Popular menu items"
        />
        {menuCategories.map((category) => (
          <div key={category.id} className="mb-14 last:mb-0">
            <h3 className="font-display text-2xl font-semibold text-dark mb-6">
              {category.title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-cream hover:bg-warm transition-colors p-4 rounded-lg border border-stone/30"
                >
                  {item.image ? (
                    <div className="aspect-[4/3] rounded-sm mb-3 overflow-hidden relative bg-stone/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full object-contain object-center"
                      />
                    </div>
                  ) : (
                    <div
                      className="aspect-[4/3] rounded-sm mb-3"
                      style={{ backgroundColor: themeColors[item.imagePlaceholder] }}
                    />
                  )}
                  <p className="text-terracotta text-xs uppercase tracking-wider mb-1">
                    {item.category}
                  </p>
                  <h4 className="font-display text-xl text-dark mb-2">{item.name}</h4>
                  <p className="text-muted text-sm line-clamp-2">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-12 flex justify-center">
          <Link href="/menu">
            <Button variant="ghost">View Full Menu</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
