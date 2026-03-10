import { services } from "@/lib/data";
import { themeColors } from "@/lib/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ArrowRight } from "lucide-react";

export function Services() {
  return (
    <section className="bg-cream py-16 md:py-24 px-4 sm:px-6 md:px-20 w-full">
      <div className="max-w-7xl mx-auto w-full">
        <SectionHeader
          label="What we offer"
          title="Catering that fits your event"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="relative aspect-[4/3] overflow-hidden rounded-lg cursor-pointer group"
            >
              {service.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={service.image}
                  alt={service.title}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div
                  className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${themeColors[service.imagePlaceholder]} 0%, ${themeColors[service.imagePlaceholder]}99 100%)`,
                  }}
                />
              )}
              <div
                className="absolute inset-0 bg-gradient-to-t from-dark/75 to-transparent"
                aria-hidden
              />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="inline-block px-3 py-1 text-terracotta text-xs uppercase tracking-wider bg-white/20 backdrop-blur-sm rounded mb-2">
                  {service.tag}
                </span>
                <h3 className="font-display text-2xl md:text-3xl text-cream mb-2">
                  {service.title}
                </h3>
                <p className="text-stone text-sm mb-3">{service.description}</p>
                <span className="inline-flex items-center gap-2 text-cream text-sm font-medium group-hover:gap-3 transition-all">
                  {service.cta}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
