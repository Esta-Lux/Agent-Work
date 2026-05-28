import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Structured alert card used contextually inside panels.
 *
 * Unlike the simple `Alert`, this card supports three structured fields:
 * - what is missing
 * - what still works
 * - recovery CTA
 *
 * Severity maps to the BootRise brand tokens (no hardcoded colors).
 */

export type AlertSeverity = "info" | "warning" | "critical" | "success";

const TONES: Record<AlertSeverity, { border: string; bg: string; pill: string; iconBg: string; iconFg: string; eyebrow: string; glyph: string; label: string }> = {
  info: {
    border: "border-line",
    bg: "bg-cloud/60",
    pill: "bg-cloud text-graphite border-line",
    iconBg: "bg-ink/5",
    iconFg: "text-graphite",
    eyebrow: "text-graphite",
    glyph: "i",
    label: "Info"
  },
  success: {
    border: "border-signal/30",
    bg: "bg-signal/8",
    pill: "bg-signal/12 text-signal border-signal/30",
    iconBg: "bg-signal/15",
    iconFg: "text-signal",
    eyebrow: "text-signal",
    glyph: "✓",
    label: "Ready"
  },
  warning: {
    border: "border-caution/35",
    bg: "bg-caution/8",
    pill: "bg-caution/12 text-caution border-caution/35",
    iconBg: "bg-caution/15",
    iconFg: "text-caution",
    eyebrow: "text-caution",
    glyph: "!",
    label: "Action needed"
  },
  critical: {
    border: "border-critical/30",
    bg: "bg-critical/8",
    pill: "bg-critical/12 text-critical border-critical/30",
    iconBg: "bg-critical/15",
    iconFg: "text-critical",
    eyebrow: "text-critical",
    glyph: "!",
    label: "Blocked"
  }
};

export interface AlertCardProps {
  severity?: AlertSeverity;
  title: string;
  /** Short summary line under the title. */
  summary?: ReactNode;
  /** What is missing or wrong. */
  missing?: ReactNode;
  /** What still works (so it doesn't feel like a full failure). */
  stillWorks?: ReactNode;
  /** Optional primary recovery action. */
  action?: { label: string; onClick: () => void };
  /** Optional secondary action (e.g. docs). */
  secondaryAction?: { label: string; onClick: () => void };
  /** Optional dismiss. */
  onDismiss?: () => void;
  className?: string;
}

export function AlertCard({
  severity = "info",
  title,
  summary,
  missing,
  stillWorks,
  action,
  secondaryAction,
  onDismiss,
  className = ""
}: AlertCardProps) {
  const tone = TONES[severity];
  return (
    <article className={`flex gap-3 rounded-2xl border ${tone.border} ${tone.bg} p-4 shadow-sm ${className}`}>
      <span
        aria-hidden
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${tone.iconBg} ${tone.iconFg}`}
      >
        {tone.glyph}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${tone.eyebrow}`}>{tone.label}</p>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.pill}`}>
            {severity}
          </span>
        </div>
        <h4 className="mt-1 text-sm font-semibold text-ink">{title}</h4>
        {summary ? <p className="mt-1 text-sm leading-6 text-graphite">{summary}</p> : null}
        {missing ? (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-steel">Missing</p>
            <div className="mt-1 text-sm leading-6 text-graphite">{missing}</div>
          </div>
        ) : null}
        {stillWorks ? (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-steel">Still works</p>
            <div className="mt-1 text-sm leading-6 text-graphite">{stillWorks}</div>
          </div>
        ) : null}
        {(action || secondaryAction || onDismiss) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {action ? (
              <Button
                type="button"
                size="sm"
                variant={severity === "critical" ? "danger" : "dark"}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ) : null}
            {secondaryAction ? (
              <Button type="button" size="sm" variant="secondary" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ) : null}
            {onDismiss ? (
              <button
                type="button"
                className="cursor-pointer text-xs font-semibold text-steel hover:text-ink"
                onClick={onDismiss}
              >
                Dismiss
              </button>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
