export function CodePathChip({ path }: { path: string }) {
  return (
    <span className="inline-block max-w-full truncate rounded-md bg-cloud px-2 py-0.5 font-mono text-[11px] text-graphite">
      {path}
    </span>
  );
}
