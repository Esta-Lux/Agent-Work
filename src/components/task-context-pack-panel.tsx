"use client";

import { useState } from "react";
import type { TaskContextPack } from "@/lib/control/types";
import { Panel } from "@/components/workspace-ui";

export function TaskContextPackPanel(input: {
  projectId: string | null;
  repositoryId: string | null;
  taskRequest: string;
  files: Array<{ path: string; content: string }>;
}) {
  const [pack, setPack] = useState<TaskContextPack | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPack(assumptionsApproved = false) {
    if (!input.taskRequest.trim() || input.files.length === 0) {
      setError("Enter a task and import a repo before previewing context.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/context-pack", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request: input.taskRequest,
          files: input.files,
          projectId: input.projectId,
          repositoryId: input.repositoryId,
          assumptionsApproved
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to build context pack.");
        setPack(null);
        return;
      }
      setPack(data.pack ?? null);
      setSummary(data.summary ?? null);
    } catch {
      setError("Network error building context pack.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel title="Task context pack">
      <p className="text-xs text-steel">
        Preview what BootRise will deep-read, reference, and exclude — plus Project Brain rules — before you spend
        credits or run Fix.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadPack(false)}
          className="rounded-lg bg-signal px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Building…" : "Preview context"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadPack(true)}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-graphite"
        >
          Preview with assumptions
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-critical">{error}</p> : null}
      {summary ? <p className="mt-2 text-xs font-medium text-ink">{summary}</p> : null}
      {pack ? (
        <div className="mt-3 space-y-2 text-xs text-graphite">
          <p>
            Gate: {pack.contextGate.status.replace(/_/g, " ")} · {Math.round(pack.contextGate.confidence * 100)}%
            confidence
          </p>
          <p className="text-steel">{pack.scopeContract.scopeLockMessage}</p>
          {pack.brainSnapshot && pack.brainSnapshot.rules.length > 0 ? (
            <div>
              <p className="font-semibold text-ink">Brain rules</p>
              <ul className="mt-1 list-inside list-disc text-steel">
                {pack.brainSnapshot.rules.slice(0, 4).map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-3">
            <FileList title="Deep read" entries={pack.contextPlan.deepRead} />
            <FileList title="Reference" entries={pack.contextPlan.reference} />
            <FileList title="Excluded (sample)" entries={pack.contextPlan.excluded.slice(0, 8)} />
          </div>
          <p className="text-steel">{pack.tokenWaste.message}</p>
          {!pack.canProceed && pack.stopReason ? (
            <p className="rounded-lg bg-amber-50 px-2 py-1 text-amber-900">{pack.stopReason}</p>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

function FileList({
  title,
  entries
}: {
  title: string;
  entries: Array<{ path: string; reason?: string }>;
}) {
  return (
    <div className="rounded-lg border border-line bg-cloud/50 p-2">
      <p className="font-semibold text-ink">
        {title} ({entries.length})
      </p>
      <ul className="mt-1 max-h-28 overflow-y-auto text-[10px] text-steel">
        {entries.slice(0, 6).map((e) => (
          <li key={e.path} className="truncate">
            {e.path}
          </li>
        ))}
      </ul>
    </div>
  );
}
