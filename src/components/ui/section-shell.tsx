import type { ReactNode } from "react";

export function SectionShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="text-xs text-steel">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
