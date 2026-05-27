"use client";

import { StatusPill } from "@/components/status-pill";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import { MonacoDiffViewer } from "@/components/monaco-diff-viewer";
import { useState } from "react";

export function PlanApprovalPanel({
  patches,
  patchSource,
  busy,
  canApprove = true,
  blockReason,
  onApprove,
  onReject
}: {
  patches: ProposedPatch[];
  patchSource?: string;
  busy: boolean;
  canApprove?: boolean;
  blockReason?: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const activePreviewPath = previewPath ?? patches[0]?.path ?? null;
  const preview = patches.find((p) => p.path === activePreviewPath) ?? patches[0];

  if (patches.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        No file patches were generated. Refine your request and run Fix again.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-signal/30 bg-signal/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase text-signal">Plan approval required</p>
          <p className="mt-1 text-sm text-graphite">
            {patches.length} proposed change(s) via {patchSource ?? "AI"}. Nothing is applied until you approve.
          </p>
        </div>
        <StatusPill label="Pending approval" tone="neutral" />
      </div>

      <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
        {patches.map((p) => (
          <li key={p.path}>
            <button
              type="button"
              onClick={() => setPreviewPath(p.path)}
              className={`w-full rounded border px-3 py-2 text-left text-xs ${
                activePreviewPath === p.path ? "border-signal bg-signal/5" : "border-line bg-white"
              }`}
            >
              <p className="font-semibold text-ink">{p.path}</p>
              <p className="text-graphite">{p.summary}</p>
              <p className="mt-1 font-mono text-[10px] text-steel">
                {p.before.length} → {p.after.length} chars
              </p>
            </button>
          </li>
        ))}
      </ul>
      {preview ? (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold text-steel">Patch preview</p>
          <MonacoDiffViewer path={preview.path} before={preview.before} after={preview.after} height={240} />
        </div>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy || !canApprove}
          className="flex-1 cursor-pointer rounded-lg bg-signal py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          onClick={onApprove}
        >
          {canApprove ? "Approve & apply patches" : "Blocked by control layer"}
        </button>
        <button
          type="button"
          disabled={busy}
          className="flex-1 cursor-pointer rounded-lg border border-line bg-white py-2.5 text-sm font-semibold text-graphite disabled:opacity-50"
          onClick={onReject}
        >
          Reject plan
        </button>
      </div>
      {!canApprove && blockReason ? (
        <p className="mt-2 text-xs text-critical">{blockReason}</p>
      ) : null}
    </div>
  );
}
