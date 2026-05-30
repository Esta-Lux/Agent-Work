"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusPill } from "@/components/ui/status-pill";

interface JobRow {
  id: string;
  type?: string;
  status?: string;
  repositoryId?: string;
  projectId?: string;
  progressPercent?: number;
  progressMessage?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  error?: string;
}

export function JobMonitor() {
  const [jobs, setJobs] = useState<JobRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/admin/workspace/jobs?limit=50");
      const body = (await res.json().catch(() => ({ jobs: [] }))) as { jobs?: JobRow[] };
      if (!cancelled) setJobs(body.jobs ?? []);
    }
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader theme="admin" eyebrow="JOBS" title="Background jobs" description="Project Brain, security, deployment, and future multi-pass work that can move off the request lifecycle." />
      <section className="rounded-lg border border-border-admin bg-panel-admin p-4">
        <div className="grid grid-cols-[1fr_120px_1fr_1fr_150px_150px] bg-surface-admin px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-text-admin-3">
          <span>Job type</span>
          <span>Status</span>
          <span>Repository</span>
          <span>Progress</span>
          <span>Started</span>
          <span>Completed</span>
        </div>
        {jobs.map((job) => (
          <div key={job.id} className="grid grid-cols-[1fr_120px_1fr_1fr_150px_150px] items-center gap-2 border-t border-border-admin px-3 py-3 text-xs">
            <span className="font-mono text-text-admin-2">{job.type ?? job.id}</span>
            <StatusPill variant={job.status === "completed" ? "signal" : job.status === "failed" ? "red" : "amber"} label={job.status ?? "unknown"} />
            <span className="truncate text-text-admin-2">{job.repositoryId ?? job.projectId ?? "not attached"}</span>
            <span className="truncate text-text-admin-3">{typeof job.progressPercent === "number" ? `${job.progressPercent}%` : "--"}{job.progressMessage ? ` · ${job.progressMessage}` : ""}</span>
            <span className="font-mono text-text-admin-3">{job.createdAt ?? "--"}</span>
            <span className="font-mono text-text-admin-3">{job.completedAt ?? job.updatedAt ?? "--"}</span>
          </div>
        ))}
        {jobs.length === 0 ? <p className="py-4 text-sm text-text-admin-3">No jobs have been recorded yet.</p> : null}
      </section>
    </div>
  );
}
