"use client";

import { CommandButton } from "@/components/ui/command-button";
import { StatusPill } from "@/components/ui/status-pill";
import type { WorkspaceFileState } from "@/lib/workspace/workspace-file-state";

interface RepoFileEditorProps {
  path?: string;
  content?: string;
  status?: WorkspaceFileState["status"];
  riskLevel?: WorkspaceFileState["riskLevel"];
  onChange: (content: string) => void;
  onReset: () => void;
}

export function RepoFileEditor({ path, content, status = "unchanged", riskLevel = "normal", onChange, onReset }: RepoFileEditorProps) {
  if (!path) {
    return <div className="p-6 text-sm text-text-ws-3">Select a file to inspect and edit.</div>;
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-ws bg-panel-ws px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium text-text-ws-1" title={path}>
            {path}
          </p>
          <p className="mt-1 text-xs text-text-ws-3">Manual edits are included in safety checks.</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill variant={status === "unchanged" ? "neutral" : status === "deleted" ? "red" : "amber"} label={status} />
          <StatusPill variant={riskLevel === "critical" ? "red" : riskLevel === "high" ? "amber" : "blue"} label={`${riskLevel} risk`} />
          <CommandButton theme="workspace" variant="secondary" size="sm" label="Reset" onClick={onReset} disabled={status === "unchanged"} />
        </div>
      </header>
      <textarea
        className="min-h-[520px] flex-1 resize-y bg-surface-ws p-5 font-mono text-xs leading-5 text-text-ws-2 outline-none focus:bg-black/10"
        spellCheck={false}
        value={content ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
