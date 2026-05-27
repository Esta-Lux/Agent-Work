import type { ReactNode } from "react";

export function PanelShell({
  id,
  title,
  eyebrow,
  description,
  action,
  children,
  className = ""
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`rounded-2xl border border-line bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-signal">{eyebrow}</p> : null}
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {description ? <p className="mt-1 text-xs leading-5 text-steel">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
