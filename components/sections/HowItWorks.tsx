"use client";

import { steps } from "@/lib/data";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ClipboardList, Send, Truck } from "lucide-react";
import { useScrollReveal } from "@/lib/useScrollReveal";
import type { LucideIcon } from "lucide-react";

const stepIcons: LucideIcon[] = [ClipboardList, Send, Truck];

export function HowItWorks() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="bg-warm py-20 md:py-28 px-4 sm:px-6 md:px-20 w-full">
      <div className="max-w-7xl mx-auto w-full">
        <SectionHeader label="Simple process" title="How it works" />
        <div ref={ref} className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          {/* Connecting line (desktop only) */}
          <div
            className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px border-t-2 border-dashed border-stone/40"
            aria-hidden
          />

          {steps.map((step, i) => {
            const Icon = stepIcons[i % stepIcons.length];
            return (
              <div
                key={step.number}
                className="relative flex flex-col items-center text-center p-8 rounded-2xl bg-cream/60 hover:bg-cream hover:shadow-lg transition-all duration-300 group"
              >
                <div className="relative z-10 w-16 h-16 rounded-full bg-terracotta/10 flex items-center justify-center mb-5 group-hover:bg-terracotta/15 transition-colors duration-300">
                  <Icon className="w-7 h-7 text-terracotta" />
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-dark text-cream text-xs font-bold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold text-dark mb-3">
                  {step.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
