export function ScoreRing({ score, label }: { score: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone = clamped >= 80 ? "text-signal" : clamped >= 50 ? "text-amber-600" : "text-critical";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-line bg-white text-lg font-bold ${tone}`}
      >
        {clamped}
      </div>
      <span className="text-xs text-steel">{label}</span>
    </div>
  );
}
