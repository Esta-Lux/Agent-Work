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

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: StatusPillTone }) {
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
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {label}
    </span>
  );
}
