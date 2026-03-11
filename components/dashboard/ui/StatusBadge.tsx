type StatusBadgeProps = {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

const toneClass: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  default: "bg-stone/20 text-stone",
  success: "bg-olive/20 text-olive",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

export function StatusBadge({ label, tone = "default" }: StatusBadgeProps) {
  return <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${toneClass[tone]}`}>{label}</span>;
}
