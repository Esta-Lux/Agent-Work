import type { ReactNode } from "react";

export function CommandCard({
  title,
  value,
  hint,
  children
}: {
  title: string;
  value: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-white/90 p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-steel">{title}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-steel">{hint}</p> : null}
      {children}
    </div>
  );
}
