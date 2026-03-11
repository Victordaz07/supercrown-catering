"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { services } from "@/lib/data";
import { themeColors } from "@/lib/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useScrollReveal } from "@/lib/useScrollReveal";

export function Services() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="bg-cream py-20 md:py-28 px-4 sm:px-6 md:px-20 w-full">
      <div className="max-w-7xl mx-auto w-full">
        <SectionHeader
          label="What we offer"
          title="Catering that fits your event"
          subtitle="From intimate box lunches to full-service catering, we have you covered."
        />
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service) => (
            <Link
              key={service.id}
              href="/menu"
              className="block relative aspect-[3/2] overflow-hidden rounded-2xl cursor-pointer group shadow-md hover:shadow-2xl transition-shadow duration-500"
            >
              {service.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={service.image}
                  alt={service.title}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-110"
                />
              ) : (
                <div
                  className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${themeColors[service.imagePlaceholder]} 0%, ${themeColors[service.imagePlaceholder]}99 100%)`,
                  }}
                />
              )}
              <div
                className="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/30 to-transparent transition-opacity duration-500 group-hover:from-dark/70"
                aria-hidden
              />
              <div className="absolute bottom-0 left-0 right-0 p-7">
                <span className="inline-block px-3 py-1.5 text-terracotta text-xs uppercase tracking-wider bg-white/15 backdrop-blur-md rounded-full mb-3 transition-transform duration-300 group-hover:-translate-y-1">
                  {service.tag}
                </span>
                <h3 className="font-display text-2xl md:text-3xl text-cream mb-2">
                  {service.title}
                </h3>
                <p className="text-stone/90 text-sm mb-4 max-w-sm">
                  {service.description}
                </p>
                <span className="inline-flex items-center gap-2 text-cream text-sm font-medium">
                  {service.cta}
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-2" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
