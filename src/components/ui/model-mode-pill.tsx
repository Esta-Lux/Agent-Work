export function ModelModePill({ mode }: { mode: string }) {
  return (
    <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink">
      {mode}
    </span>
  );
}
