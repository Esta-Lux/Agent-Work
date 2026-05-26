import type { ReactNode } from "react";

export function EmptyStateCard({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-cloud/40 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm text-steel">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
