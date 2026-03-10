import { trustItems } from "@/lib/data";

export function TrustBar() {
  return (
    <section className="bg-dark py-6 px-4 sm:px-6 md:px-20 overflow-hidden w-full">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-center md:justify-between items-center gap-4 md:gap-8 w-full">
        {trustItems.map((item) => (
          <div
            key={item}
            className="flex items-center gap-2 min-w-0 shrink-0"
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-terracotta shrink-0"
              aria-hidden
            />
            <span className="text-stone text-xs md:text-sm uppercase tracking-wider truncate">
              {item}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
