"use client";

import type { NextAction } from "@/lib/workspace/next-action";

const VARIANT: Record<
  NextAction["severity"],
  { bg: string; ring: string; helper: string }
> = {
  primary: {
    bg: "bg-ink text-white hover:bg-graphite",
    ring: "focus-visible:ring-signal/40",
    helper: "text-steel"
  },
  info: {
    bg: "bg-ink text-white hover:bg-graphite",
    ring: "focus-visible:ring-signal/40",
    helper: "text-steel"
  },
  warning: {
    bg: "bg-caution text-white hover:opacity-90",
    ring: "focus-visible:ring-caution/40",
    helper: "text-caution"
  },
  critical: {
    bg: "bg-critical text-white hover:opacity-90",
    ring: "focus-visible:ring-critical/40",
    helper: "text-critical"
  }
};

export interface NextActionButtonProps {
  action: NextAction;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  showHelper?: boolean;
  className?: string;
}

export function NextActionButton({ action, onClick, size = "md", showHelper = false, className = "" }: NextActionButtonProps) {
  const tone = VARIANT[action.severity];
  const sizing = size === "lg" ? "px-5 py-3 text-sm" : size === "md" ? "px-4 py-2.5 text-sm" : "px-3 py-2 text-xs";
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <button
        type="button"
        disabled={action.disabled}
        onClick={onClick}
        aria-label={`${action.label}: ${action.reason}`}
        className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${tone.bg} ${tone.ring} ${sizing}`}
      >
        {action.label}
        <span aria-hidden className="text-[0.85em] opacity-70">
          →
        </span>
      </button>
      {showHelper ? (
        <p className={`text-[11px] leading-snug ${tone.helper}`}>{action.reason}</p>
      ) : null}
    </div>
  );
}
