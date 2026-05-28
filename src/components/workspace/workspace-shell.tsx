"use client";

import type { ReactNode } from "react";

/**
 * WorkspaceShell — root layout for Command Center v2.
 *
 * Layout:
 *   Desktop (>= 1280px):   [ rail | mission thread | operation panel ]
 *   Tablet  (>= 768px):    [ mission thread | operation panel ]
 *                          (rail collapses into a horizontal strip at top)
 *   Mobile  (< 768px):     stacked single column with bottom command drawer
 *
 * It is purely presentational — it accepts pre-rendered children.
 */
export function WorkspaceShell({
  commandCenter,
  rail,
  thread,
  operation,
  bottomBar,
  /** Optional banner row above the command center (e.g. global system alerts). */
  banner,
  className = ""
}: {
  commandCenter: ReactNode;
  rail: ReactNode;
  thread: ReactNode;
  operation: ReactNode;
  bottomBar?: ReactNode;
  banner?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1500px] px-3 pb-24 pt-5 sm:px-5 sm:pb-8 lg:px-6 ${className}`}>
      {banner ? <div className="mb-3">{banner}</div> : null}
      {commandCenter ? <div className="mb-4">{commandCenter}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="hidden xl:block">{rail}</div>
        <div className="xl:hidden">
          <div className="rounded-2xl border border-line bg-white p-2 shadow-sm">{rail}</div>
        </div>

        <div className="flex min-h-[640px] flex-col lg:min-h-[700px]">{thread}</div>

        <div className="flex min-h-[640px] flex-col lg:min-h-[700px]">{operation}</div>
      </div>

      {bottomBar ? bottomBar : null}
    </div>
  );
}
