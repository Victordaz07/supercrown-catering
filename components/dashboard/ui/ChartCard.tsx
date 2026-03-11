"use client";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  minHeightClassName?: string;
};

export function ChartCard({
  title,
  subtitle,
  children,
  minHeightClassName = "min-h-[260px]",
}: ChartCardProps) {
  return (
    <div className="bg-white rounded-xl border border-stone/20 p-4 shadow-sm">
      <div className="mb-3">
        <p className="font-medium text-dark">{title}</p>
        {subtitle ? <p className="text-xs text-muted mt-1">{subtitle}</p> : null}
      </div>
      <div className={minHeightClassName}>{children}</div>
    </div>
  );
}
