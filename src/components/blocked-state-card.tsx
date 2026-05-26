import type { ReactNode } from "react";
import { StatusPill } from "@/components/ui/status-pill";

export function BlockedStateCard({
  title,
  reason,
  needs,
  actions
}: {
  title: string;
  reason: string;
  needs?: string[];
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <StatusPill label="Blocked" tone="warning" />
          <h3 className="mt-2 text-base font-semibold text-ink">{title}</h3>
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-graphite">
        <span className="font-medium text-ink">Why: </span>
        {reason}
      </p>
      {needs?.length ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-steel">BootRise needs</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-graphite">
            {needs.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ol>
        </div>
      ) : null}
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
