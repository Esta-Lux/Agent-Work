"use client";

import { StatusPill } from "@/components/status-pill";
import type { RepoHealthSummary, SafeToPrVerdict } from "@/lib/workspace/workspace-types";

export function ProjectDashboard({
  projectName,
  fileCount,
  githubUrl,
  branch,
  health,
  sandboxPassed,
  safeToPr,
  storage,
  lastSaved
}: {
  projectName: string;
  fileCount: number;
  githubUrl?: string;
  branch?: string;
  health: RepoHealthSummary | null;
  sandboxPassed?: boolean;
  safeToPr?: SafeToPrVerdict | null;
  storage?: string;
  lastSaved?: string | null;
}) {
  if (fileCount === 0 && !health) return null;

  const scoreTone = !health ? "neutral" : health.score >= 80 ? "neutral" : health.score >= 60 ? "neutral" : "failed";
  const prTone = safeToPr?.status === "yes" ? "neutral" : safeToPr?.status === "caution" ? "neutral" : safeToPr ? "failed" : "neutral";

  return (
    <div className="mb-4 rounded-lg border border-line bg-cloud/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase text-steel">Project dashboard</p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{projectName || "Untitled project"}</p>
        </div>
        {health ? (
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase text-steel">Architecture health</p>
            <p className="text-2xl font-semibold text-ink">{health.score}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <StatusPill label={`${fileCount} files`} tone="neutral" />
        {storage ? <StatusPill label={storage === "supabase" ? "Cloud saved" : "Local"} tone="neutral" /> : null}
        {sandboxPassed ? <StatusPill label="Sandbox passed" tone="neutral" /> : null}
        {health ? <StatusPill label={`Health ${health.score}`} tone={scoreTone} /> : null}
        {safeToPr ? <StatusPill label={`PR: ${safeToPr.label}`} tone={prTone} /> : null}
      </div>

      {githubUrl ? (
        <p className="mt-2 truncate text-xs text-steel">
          {githubUrl}
          {branch ? ` @ ${branch}` : ""}
        </p>
      ) : null}

      {health && health.signals.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {health.signals.slice(0, 3).map((s) => (
            <li key={s.id} className="text-xs text-graphite">
              <span className="font-medium text-ink">{s.label}:</span> {s.value} — {s.detail}
            </li>
          ))}
        </ul>
      ) : null}

      {lastSaved ? <p className="mt-2 text-[10px] text-steel">Last saved {new Date(lastSaved).toLocaleString()}</p> : null}
    </div>
  );
}
