"use client";

import type { ReactNode } from "react";
import { StatusPill, type StatusPillTone } from "@/components/ui/status-pill";

/**
 * Operation panel — the right column.
 *
 * Tabs are grouped into Workflow and Intelligence. Locked tabs render
 * dimmed with a tooltip explaining the prerequisite.
 */

export type OperationGroup = "workflow" | "intelligence";

export interface OperationTab {
  id: string;
  label: string;
  group: OperationGroup;
  /** Optional badge text shown after the label. */
  badge?: string;
  badgeTone?: StatusPillTone;
  /** Indicates a problem in this panel (security/control). */
  alertDot?: boolean;
  /** When provided, tab is shown dimmed and disabled. */
  lockedReason?: string;
}

export interface OperationPanelShellProps {
  /** All tabs (workflow + intelligence). */
  tabs: OperationTab[];
  activeTab: string;
  onSelect: (id: string) => void;
  /** Title of the active tab. */
  title: string;
  /** Optional short description under the title. */
  description?: string;
  /** Optional CTAs shown in the panel header. */
  headerActions?: ReactNode;
  /** Panel body. */
  children: ReactNode;
  className?: string;
}

export function OperationPanelShell({
  tabs,
  activeTab,
  onSelect,
  title,
  description,
  headerActions,
  children,
  className = ""
}: OperationPanelShellProps) {
  const workflow = tabs.filter((t) => t.group === "workflow");
  const intelligence = tabs.filter((t) => t.group === "intelligence");
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card ${className}`}
      aria-label="Operation panel"
    >
      <div className="border-b border-line bg-white">
        <TabGroup label="Workflow" tabs={workflow} activeTab={activeTab} onSelect={onSelect} />
        <TabGroup label="Intelligence" tabs={intelligence} activeTab={activeTab} onSelect={onSelect} muted />
      </div>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-white px-5 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-signal">Operation</p>
          <h2 className="mt-0.5 truncate text-sm font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-xs leading-5 text-steel">{description}</p> : null}
        </div>
        {headerActions ? <div className="flex shrink-0 items-center gap-2">{headerActions}</div> : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

function TabGroup({
  label,
  tabs,
  activeTab,
  onSelect,
  muted = false
}: {
  label: string;
  tabs: OperationTab[];
  activeTab: string;
  onSelect: (id: string) => void;
  muted?: boolean;
}) {
  if (tabs.length === 0) return null;
  return (
    <div className={`flex items-stretch gap-1 overflow-x-auto px-3 py-2 ${muted ? "border-t border-line bg-cloud/30" : ""}`}>
      <span
        className={`flex shrink-0 items-center px-2 text-[9px] font-semibold uppercase tracking-[0.22em] ${
          muted ? "text-steel" : "text-signal"
        }`}
      >
        {label}
      </span>
      <ul className="flex items-stretch gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const locked = Boolean(tab.lockedReason);
          return (
            <li key={tab.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() => onSelect(tab.id)}
                title={tab.lockedReason ?? tab.label}
                aria-current={isActive ? "page" : undefined}
                className={`relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/40 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive
                    ? "bg-ink text-white shadow-sm"
                    : locked
                      ? "bg-transparent text-steel"
                      : "text-graphite hover:bg-cloud"
                }`}
              >
                <span>{tab.label}</span>
                {tab.alertDot && !isActive ? (
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-critical" />
                ) : null}
                {tab.badge ? <StatusPill label={tab.badge} tone={tab.badgeTone ?? "neutral"} /> : null}
                {locked ? (
                  <span aria-hidden className="text-[9px] text-steel">
                    🔒
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
