interface SectionHeaderProps {
  label: string;
  title: string;
  variant?: "light" | "dark";
}

export function SectionHeader({ label, title, variant = "light" }: SectionHeaderProps) {
  const labelColor = variant === "dark" ? "text-stone" : "text-muted";
  const titleColor = variant === "dark" ? "text-cream" : "text-dark";

  return (
    <div className="mb-12">
      <p className={`text-sm uppercase tracking-widest ${labelColor} mb-2`}>
        {label}
      </p>
      <h2 className={`font-display text-4xl md:text-5xl font-light ${titleColor}`}>
        {title}
      </h2>
    </div>
  );
}
