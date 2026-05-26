export function TimelineEvent({
  title,
  narrative,
  time,
  tone = "neutral"
}: {
  title: string;
  narrative: string;
  time?: string;
  tone?: "neutral" | "signal" | "warning";
}) {
  const dot =
    tone === "signal" ? "bg-signal" : tone === "warning" ? "bg-amber-500" : "bg-line";
  return (
    <div className="flex gap-3">
      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <div className="min-w-0 flex-1 border-b border-line/60 pb-3">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-steel">{narrative}</p>
        {time ? <p className="mt-1 text-[10px] text-steel">{time}</p> : null}
      </div>
    </div>
  );
}
