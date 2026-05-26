"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import type { ArchitectureMapPayload } from "@/lib/workspace/architecture-map";

export function ArchitectureMapPanel({
  files,
  repositoryId,
  blastRootSymbol
}: {
  files: Array<{ path: string; content: string }>;
  repositoryId?: string | null;
  blastRootSymbol?: string | null;
}) {
  const [map, setMap] = useState<ArchitectureMapPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (files.length === 0) {
      setMap(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch("/api/workspace/architecture/map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files,
        repositoryId: repositoryId ?? undefined,
        blastRootSymbol: blastRootSymbol ?? undefined
      })
    })
      .then(async (res) => {
        const data = (await res.json()) as { map?: ArchitectureMapPayload; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Map failed");
        if (!cancelled) setMap(data.map ?? null);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Map failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [files, repositoryId, blastRootSymbol]);

  if (files.length === 0) {
    return <p className="text-sm text-steel">Import a repository to generate the architecture map.</p>;
  }

  if (loading) return <p className="text-sm text-steel">Building architecture map from {files.length} files…</p>;
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!map) return null;

  const width = Math.max(320, ...map.nodes.map((n) => n.x + 100));
  const height = Math.max(200, ...map.nodes.map((n) => n.y + 48));

  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-graphite">{map.summary}</p>
      <div className="flex flex-wrap gap-2">
        <StatusPill label={`${map.nodes.length} symbols`} tone="neutral" />
        <StatusPill label={`${map.edges.length} links`} tone="neutral" />
        {map.impactedCount > 0 ? (
          <StatusPill label={`${map.impactedCount} in blast zone`} tone="failed" />
        ) : null}
        {map.rootSymbol ? <StatusPill label={`Root: ${map.rootSymbol}`} tone="neutral" /> : null}
      </div>

      <div className="overflow-auto rounded-lg border border-line bg-white">
        <svg width={width} height={height} className="min-w-full">
          {map.edges.map((edge) => {
            const from = map.nodes.find((n) => n.id === edge.from);
            const to = map.nodes.find((n) => n.id === edge.to);
            if (!from || !to) return null;
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.x + 40}
                y1={from.y + 16}
                x2={to.x + 40}
                y2={to.y + 16}
                stroke="#cbd5e1"
                strokeWidth={1}
              />
            );
          })}
          {map.nodes.map((node) => {
            const hot = node.blastDepth > 0;
            const active = selected === node.id;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer"
                onClick={() => setSelected(node.id)}
              >
                <rect
                  width={96}
                  height={32}
                  rx={6}
                  fill={hot ? "#fef3c7" : active ? "#e0e7ff" : "#f8fafc"}
                  stroke={hot ? "#f59e0b" : active ? "#6366f1" : "#e2e8f0"}
                />
                <text x={8} y={14} className="fill-ink text-[9px] font-semibold">
                  {node.label.slice(0, 12)}
                </text>
                <text x={8} y={26} className="fill-steel text-[8px]">
                  {node.module.slice(0, 14)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selected ? (
        <p className="text-xs text-graphite">
          <span className="font-semibold text-ink">Selected:</span>{" "}
          {map.nodes.find((n) => n.id === selected)?.path}
        </p>
      ) : null}
    </div>
  );
}
