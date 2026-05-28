export type StatusPillTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "signal"
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "pending"
  | "passed"
  | "failed"
  | "skipped";

export type StatusPillVariant = "signal" | "amber" | "red" | "neutral" | "blue";

interface StatusPillProps {
  label: string;
  variant?: StatusPillVariant;
  dot?: boolean;
  tone?: StatusPillTone;
}

const toneToVariant: Record<StatusPillTone, StatusPillVariant> = {
  neutral: "neutral",
  success: "signal",
  warning: "amber",
  danger: "red",
  signal: "signal",
  low: "signal",
  medium: "amber",
  high: "red",
  critical: "red",
  pending: "neutral",
  passed: "signal",
  failed: "red",
  skipped: "neutral"
};

const variantClasses: Record<StatusPillVariant, { pill: string; dot: string }> = {
  signal: { pill: "border-signal/30 bg-signal-glow text-signal-text", dot: "bg-signal-text" },
  amber: { pill: "border-amber-400/25 bg-amber-400/10 text-amber-400", dot: "bg-amber-400" },
  red: { pill: "border-red-400/25 bg-red-400/10 text-red-400", dot: "bg-red-400" },
  neutral: { pill: "border-white/10 bg-white/5 text-text-ws-2", dot: "bg-text-ws-2" },
  blue: { pill: "border-blue-500/25 bg-blue-500/10 text-blue-400", dot: "bg-blue-400" }
};

export function StatusPill({ label, variant, dot = false, tone }: StatusPillProps) {
  const resolved = variant ?? toneToVariant[tone ?? "neutral"];

  if (variant) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide ${variantClasses[resolved].pill}`}
      >
        {dot ? (
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${variantClasses[resolved].dot} ${resolved === "signal" ? "animate-pulse" : ""}`}
          />
        ) : null}
        {label}
      </span>
    );
  }

  const tones = {
    neutral: "bg-cloud text-graphite border-line",
    success: "bg-signal/10 text-signal border-signal/30",
    warning: "bg-caution/10 text-caution border-caution/30",
    danger: "bg-critical/10 text-critical border-critical/25",
    signal: "bg-signal/15 text-signal border-signal/40",
    low: "bg-signal/10 text-signal border-signal/25",
    medium: "bg-caution/10 text-caution border-caution/30",
    high: "bg-critical/10 text-critical border-critical/25",
    critical: "bg-critical/15 text-critical border-critical/30",
    pending: "bg-white text-steel border-steel/25",
    passed: "bg-signal/10 text-signal border-signal/25",
    failed: "bg-critical/10 text-critical border-critical/25",
    skipped: "bg-cloud text-steel border-line"
  };
  const resolvedTone = tone ?? "neutral";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[resolvedTone]}`}>
      {label}
    </span>
  );
}
