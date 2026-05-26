"use client";

import { useCallback, useEffect, useState } from "react";
import { ProjectMemoryCard } from "@/components/project-memory-card";
import { ProjectRulesPanel } from "@/components/project-rules-panel";
import { ProjectDecisionsPanel } from "@/components/project-decisions-panel";
import type { FileIndexEntry, ModuleIndexEntry, ProjectBrainSummary, ProjectMemoryItem } from "@/lib/project-brain/types";
import { Panel } from "@/components/workspace-ui";

export function ProjectBrainPanel({ projectId }: { projectId: string | null }) {
  const [summary, setSummary] = useState<ProjectBrainSummary | null>(null);
  const [memoryItems, setMemoryItems] = useState<ProjectMemoryItem[]>([]);
  const [modules, setModules] = useState<ModuleIndexEntry[]>([]);
  const [riskyFiles, setRiskyFiles] = useState<FileIndexEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/brain?projectId=${encodeURIComponent(projectId)}`, {
        credentials: "include"
      });
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary ?? null);
        setMemoryItems(data.memoryItems ?? []);
        setModules(data.modules ?? []);
        setRiskyFiles(data.riskyFiles ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function correctMemory(id: string, newValue: string) {
    if (!projectId) return;
    await fetch("/api/workspace/brain/correct", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, memoryItemId: id, newValue })
    });
    await load();
  }

  if (!projectId) {
    return (
      <Panel title="Project Brain">
        <p className="text-sm text-steel">Save a project and import a repo to build BootRise&apos;s durable memory.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <Panel title="Project Brain growth">
        {loading ? (
          <p className="text-sm text-steel">Loading Project Brain…</p>
        ) : summary ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Files indexed" value={String(summary.fileCount)} />
            <Stat label="Modules mapped" value={String(summary.moduleCount)} />
            <Stat label="Rules learned" value={String(memoryItems.filter((m) => m.type === "rule").length)} />
            <Stat label="Decisions" value={String(memoryItems.filter((m) => m.type === "decision").length)} />
            <Stat label="Risk areas" value={String(riskyFiles.length)} warn={riskyFiles.length > 0} />
            <Stat label="Stale memories" value={String(summary.staleCount)} warn={summary.staleCount > 0} />
            <Stat label="Avg confidence" value={`${(summary.avgConfidence * 100).toFixed(0)}%`} />
          </div>
        ) : (
          <p className="text-sm text-steel">No brain yet — import a GitHub repo to index files and modules.</p>
        )}
        {summary?.brain.summary ? <p className="mt-3 text-sm text-steel">{summary.brain.summary}</p> : null}
      </Panel>

      <Panel title="Modules">
        {modules.length === 0 ? (
          <p className="text-sm text-steel">No modules indexed.</p>
        ) : (
          <ul className="space-y-2">
            {modules.map((m) => (
              <li key={m.id} className="rounded border border-line p-2 text-sm">
                <p className="font-medium text-ink">{m.name}</p>
                <p className="text-steel">{m.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Memory">
        <ul className="space-y-2">
          {memoryItems.map((item) => (
            <ProjectMemoryCard key={item.id} item={item} onCorrect={correctMemory} />
          ))}
        </ul>
      </Panel>

      <ProjectRulesPanel items={memoryItems} />
      <ProjectDecisionsPanel items={memoryItems} />

      <Panel title="Risky files">
        {riskyFiles.length === 0 ? (
          <p className="text-sm text-steel">No elevated-risk paths in index.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {riskyFiles.map((f) => (
              <li key={f.id} className="flex justify-between gap-2">
                <span className="font-mono text-xs text-ink">{f.path}</span>
                <span className="text-xs text-amber-700">{f.riskLevel}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${warn ? "border-amber-300 bg-amber-50" : "border-line bg-cloud/40"}`}>
      <p className="text-xs text-steel">{label}</p>
      <p className="text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
