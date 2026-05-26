export function BootRiseLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box =
    size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";
  const title = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${box} flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-signal to-signal-bright font-bold text-white shadow-glow`}
        aria-hidden
      >
        BR
      </div>
      <div>
        <p className={`${title} font-semibold tracking-tight text-ink`}>BootRise</p>
        {size !== "sm" ? (
          <p className="text-xs text-steel">AI control layer for large codebases</p>
        ) : null}
      </div>
    </div>
  );
}
