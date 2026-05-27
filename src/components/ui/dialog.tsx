"use client";

import type { ReactNode } from "react";

export function Dialog({
  open,
  eyebrow,
  title,
  children,
  footer
}: {
  open: boolean;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-card">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wider text-signal">{eyebrow}</p> : null}
        <h3 className="mt-2 text-lg font-semibold text-ink">{title}</h3>
        <div className="mt-3">{children}</div>
        {footer ? <div className="mt-6 flex gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
