export function StatusPill({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "signal";
}) {
  const tones = {
    neutral: "bg-cloud text-graphite border-line",
    success: "bg-signal/10 text-signal border-signal/30",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-red-50 text-critical border-red-200",
    signal: "bg-signal/15 text-signal border-signal/40"
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {label}
    </span>
  );
}
