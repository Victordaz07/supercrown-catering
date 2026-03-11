"use client";

import { useScrollReveal } from "@/lib/useScrollReveal";

interface SectionHeaderProps {
  label: string;
  title: string;
  subtitle?: string;
  variant?: "light" | "dark";
}

export function SectionHeader({
  label,
  title,
  subtitle,
  variant = "light",
}: SectionHeaderProps) {
  const ref = useScrollReveal<HTMLDivElement>();
  const labelColor = variant === "dark" ? "text-stone" : "text-muted";
  const titleColor = variant === "dark" ? "text-cream" : "text-dark";
  const subtitleColor = variant === "dark" ? "text-stone" : "text-muted";
  const lineColor = variant === "dark" ? "bg-terracotta/60" : "bg-terracotta";

  return (
    <div ref={ref} className="mb-12">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-0.5 ${lineColor} rounded-full`} />
        <p
          className={`text-sm uppercase tracking-widest ${labelColor}`}
        >
          {label}
        </p>
      </div>
      <h2
        className={`font-display text-4xl md:text-5xl font-light ${titleColor}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-3 text-lg ${subtitleColor} max-w-2xl`}>{subtitle}</p>
      )}
    </div>
  );
}
