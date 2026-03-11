type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
};

const toneClass: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "border-stone/30",
  success: "border-olive/40",
  warning: "border-amber-300",
  danger: "border-terracotta/50",
};

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm ${toneClass[tone]}`}>
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="font-display text-3xl text-dark mt-1">{value}</p>
      {hint ? <p className="text-xs text-muted mt-2">{hint}</p> : null}
    </div>
  );
}
