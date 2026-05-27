"use client";

import { useEffect, useMemo, useState } from "react";
import type { RepoGraphSummary } from "@/lib/intelligence/repo-graph";

export function RepoGraphPanel({
  files,
  repositoryId
}: {
  files: Array<{ path: string; content: string }>;
  repositoryId: string | null;
}) {
  const [graph, setGraph] = useState<RepoGraphSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const fileHash = useMemo(() => filesInputHash(files), [files]);

  useEffect(() => {
    if (files.length < 8) {
      setGraph(null);
      return;
    }
    let cancelled = false;
    setBusy(true);
    void (async () => {
      try {
        const res = await fetch("/api/workspace/intelligence/graph", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files, repositoryId: repositoryId ?? "workspace" })
        });
        const data = await res.json();
        if (!cancelled && res.ok) setGraph(data.graph ?? null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileHash, files, repositoryId]);

  if (files.length < 8) {
    return <p className="text-xs text-steel">Import more files to build the module graph.</p>;
  }
  if (busy && !graph) return <p className="text-xs text-steel">Building repo graph…</p>;
  if (!graph) return null;

  return (
    <div className="mt-4 rounded-lg border border-line bg-cloud/50 p-3 text-xs">
      <p className="font-semibold text-ink">Repo graph (Brain v2)</p>
      <p className="mt-1 text-steel">{graph.summary}</p>
      <ul className="mt-2 space-y-1">
        {graph.modules.map((m) => (
          <li key={m.name} className="text-graphite">
            <span className="font-medium text-ink">{m.name}</span> — {m.fileCount} files
            {m.paths.length ? ` (e.g. ${m.paths[0]})` : ""}
          </li>
        ))}
      </ul>
      {graph.hubFiles.length ? (
        <p className="mt-2 text-steel">
          Hub files: <span className="font-mono text-[10px]">{graph.hubFiles.slice(0, 4).join(", ")}</span>
        </p>
      ) : null}
    </div>
  );
}

function filesInputHash(files: Array<{ path: string }>): string {
  return `${files.length}:${files[0]?.path ?? ""}:${files[files.length - 1]?.path ?? ""}`;
}
