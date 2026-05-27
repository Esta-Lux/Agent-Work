import type { ReactNode } from "react";

export function MetricTile({
  label,
  value,
  detail,
  children,
  size = "compact"
}: {
  label: string;
  value: string;
  detail?: string;
  children?: ReactNode;
  size?: "compact" | "hero";
}) {
  return (
    <div className="rounded-xl border border-line bg-white/90 p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-steel">{label}</p>
      <p className={size === "hero" ? "mt-2 text-2xl font-semibold text-ink" : "mt-1 text-sm font-semibold text-ink"}>
        {value}
      </p>
      {detail ? <p className="mt-0.5 text-xs text-steel">{detail}</p> : null}
      {children}
    </div>
  );
}
