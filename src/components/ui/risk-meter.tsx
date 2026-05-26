export function RiskMeter({ level }: { level: "low" | "medium" | "high" | "critical" }) {
  const widths = { low: "25%", medium: "50%", high: "75%", critical: "100%" };
  const colors = {
    low: "bg-signal",
    medium: "bg-amber-500",
    high: "bg-orange-600",
    critical: "bg-critical"
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-steel">Risk</span>
        <span className="font-medium capitalize text-ink">{level}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full ${colors[level]}`} style={{ width: widths[level] }} />
      </div>
    </div>
  );
}
