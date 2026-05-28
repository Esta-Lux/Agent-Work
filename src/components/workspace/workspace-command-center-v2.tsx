"use client";

import type { ReactNode } from "react";
import { NextActionButton } from "@/components/workspace/next-action-button";
import { StatusPill, type StatusPillTone } from "@/components/ui/status-pill";
import type { NextAction } from "@/lib/workspace/next-action";

export interface CommandCenterTile {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone?: StatusPillTone;
  onClick?: () => void;
}

export interface CommandCenterV2Props {
  projectName: string;
  mission: string;
  modeBadge: { label: string; tone?: StatusPillTone };
  /** Render-prop slot for extra mode pills/badges in the header (e.g. ModelModePill). */
  modeSlot?: ReactNode;
  nextAction: NextAction;
  onNextActionClick: () => void;
  tiles: CommandCenterTile[];
  className?: string;
}

const TILE_TONE: Record<StatusPillTone, string> = {
  neutral: "border-line bg-white",
  success: "border-signal/25 bg-signal/8",
  warning: "border-caution/30 bg-caution/8",
  danger: "border-critical/25 bg-critical/8",
  signal: "border-signal/25 bg-signal/10",
  low: "border-signal/20 bg-signal/8",
  medium: "border-caution/25 bg-caution/8",
  high: "border-critical/25 bg-critical/8",
  critical: "border-critical/30 bg-critical/10",
  pending: "border-line bg-white",
  passed: "border-signal/25 bg-signal/8",
  failed: "border-critical/25 bg-critical/8",
  skipped: "border-line bg-cloud/50"
};

export function WorkspaceCommandCenterV2({
  projectName,
  mission,
  modeBadge,
  modeSlot,
  nextAction,
  onNextActionClick,
  tiles,
  className = ""
}: CommandCenterV2Props) {
  return (
    <section
      aria-label="Project command center"
      className={`overflow-hidden rounded-3xl border border-line bg-[radial-gradient(circle_at_top_left,rgba(13,122,95,0.12),transparent_40%),linear-gradient(135deg,#ffffff,#f7fbfa)] shadow-card ${className}`}
    >
      <div className="grid gap-5 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-signal">BootRise Command Center</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-ink">{projectName || "Untitled project"}</h1>
            <StatusPill label={modeBadge.label} tone={modeBadge.tone ?? "neutral"} />
            {modeSlot}
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-graphite">
            <span className="font-semibold text-ink">Mission:</span> {mission}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-1.5 sm:min-w-60">
          <NextActionButton action={nextAction} onClick={onNextActionClick} size="lg" />
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-steel">
            One safe action
          </p>
          <p className="text-center text-[11px] leading-snug text-steel">{nextAction.reason}</p>
        </div>
      </div>
      <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-6">
        {tiles.map((tile) => {
          const tone = tile.tone ?? "neutral";
          const interactive = Boolean(tile.onClick);
          return (
            <button
              key={tile.id}
              type="button"
              disabled={!interactive}
              onClick={tile.onClick}
              className={`group flex flex-col items-start gap-1 border-0 px-4 py-3 text-left transition disabled:cursor-default ${TILE_TONE[tone]} ${interactive ? "cursor-pointer hover:brightness-[0.97]" : ""}`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-steel">{tile.label}</span>
              <span className="text-sm font-semibold text-ink">{tile.value}</span>
              {tile.hint ? <span className="text-[11px] text-steel">{tile.hint}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
