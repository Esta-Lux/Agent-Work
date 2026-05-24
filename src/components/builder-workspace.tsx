"use client";

import { useMemo, useState } from "react";
import { PlanPanel } from "@/components/plan-panel";
import { StatusPill } from "@/components/status-pill";
import type { ChangePlan, DiffPreview, PreviewProject, RepoIntelligenceSnapshot } from "@/lib/types/core";
import type { VerificationSummary } from "@/lib/verification/verification-summary";

interface ApiPlanResponse {
  plan: ChangePlan;
}

interface ApiRepoResponse {
  repo: RepoIntelligenceSnapshot;
}

interface ApiDiffResponse {
  preview: DiffPreview;
}

interface ApiExecutionResponse {
  preview: PreviewProject;
}

interface ApiVerificationResponse {
  verification: VerificationSummary;
  output: string[];
}

const sampleFiles = JSON.stringify(
  [
    {
      path: "src/app/page.tsx",
      content: "export default function Page() { return <main>Welcome</main>; }"
    },
    {
      path: "src/app/api/contact/route.ts",
      content: "export async function POST() { return Response.json({ ok: true }); }"
    },
    {
      path: "src/lib/auth/session.ts",
      content: "export function getSession() { return null; }"
    }
  ],
  null,
  2
);

export function BuilderWorkspace() {
  const [request, setRequest] = useState("Build a clean SaaS landing page with pricing and contact capture");
  const [filesInput, setFilesInput] = useState(sampleFiles);
  const [repo, setRepo] = useState<RepoIntelligenceSnapshot | null>(null);
  const [plan, setPlan] = useState<ChangePlan | null>(null);
  const [diff, setDiff] = useState<DiffPreview | null>(null);
  const [preview, setPreview] = useState<PreviewProject | null>(null);
  const [verification, setVerification] = useState<ApiVerificationResponse | null>(null);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string | null>(null);

  const canApprove = Boolean(plan);
  const canExecute = Boolean(plan && diff);

  const repoStats = useMemo(() => {
    if (!repo) return null;
    return {
      files: repo.files.length,
      symbols: repo.symbols.length,
      dependencies: repo.dependencies.length
    };
  }, [repo]);

  async function analyzeRepo() {
    setError(null);
    setStatus("Analyzing repository");

    try {
      const files = JSON.parse(filesInput) as Array<{ path: string; content: string; sizeBytes?: number }>;
      const response = await fetch("/api/repositories/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files })
      });
      const data = (await response.json()) as ApiRepoResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Repository analysis failed.");
      setRepo(data.repo);
      setStatus("Repository analyzed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Repository analysis failed.");
      setStatus("Blocked");
    }
  }

  async function createPlan() {
    setError(null);
    setStatus("Creating plan");
    setDiff(null);
    setPreview(null);
    setVerification(null);

    try {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request })
      });
      const data = (await response.json()) as ApiPlanResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Plan creation failed.");
      setPlan(data.plan);
      setStatus("Plan ready for review");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Plan creation failed.");
      setStatus("Blocked");
    }
  }

  async function approvePlan() {
    if (!plan) return;
    setError(null);
    setStatus("Approving plan");

    try {
      const approval = await fetch(`/api/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" })
      });
      const approvalData = (await approval.json()) as { error?: string };
      if (!approval.ok) throw new Error(approvalData.error ?? "Plan approval failed.");

      const response = await fetch("/api/diffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id })
      });
      const data = (await response.json()) as ApiDiffResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Diff preview failed.");
      setDiff(data.preview);
      setStatus("Diff ready for review");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Plan approval failed.");
      setStatus("Blocked");
    }
  }

  async function executePreview() {
    if (!plan) return;
    setError(null);
    setStatus("Executing approved dry run");

    try {
      const response = await fetch("/api/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, approved: true })
      });
      const data = (await response.json()) as ApiExecutionResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Execution failed.");
      setPreview(data.preview);
      setStatus("Preview generated");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Execution failed.");
      setStatus("Blocked");
    }
  }

  async function runVerification() {
    if (!plan) return;
    setError(null);
    setStatus("Running verification");

    try {
      const response = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id })
      });
      const data = (await response.json()) as ApiVerificationResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Verification failed.");
      setVerification(data);
      setStatus("Verification complete");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verification failed.");
      setStatus("Blocked");
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-steel">Interactive Builder</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Plan, approve, preview</h2>
        </div>
        <StatusPill label={status} tone={error ? "failed" : "neutral"} />
      </div>

      {error ? <div className="mb-4 rounded border border-critical/25 bg-critical/10 p-3 text-sm text-critical">{error}</div> : null}

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <div className="rounded border border-line bg-white p-4">
            <label className="text-sm font-semibold text-ink" htmlFor="repo-files">
              Repository files JSON
            </label>
            <textarea
              id="repo-files"
              className="mt-3 min-h-56 w-full resize-y rounded border border-line bg-cloud p-3 text-xs leading-5 text-graphite"
              value={filesInput}
              onChange={(event) => setFilesInput(event.target.value)}
            />
            <button className="mt-3 rounded bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={analyzeRepo}>
              Analyze Repo
            </button>
            {repoStats ? (
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <MiniStat label="Files" value={repoStats.files} />
                <MiniStat label="Symbols" value={repoStats.symbols} />
                <MiniStat label="Deps" value={repoStats.dependencies} />
              </div>
            ) : null}
          </div>

          <div className="rounded border border-line bg-white p-4">
            <label className="text-sm font-semibold text-ink" htmlFor="change-request">
              Change request
            </label>
            <textarea
              id="change-request"
              className="mt-3 min-h-28 w-full resize-y rounded border border-line bg-cloud p-3 text-sm leading-6 text-graphite"
              value={request}
              onChange={(event) => setRequest(event.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={createPlan}>
                Create Plan
              </button>
              <button
                className="rounded bg-signal px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canApprove}
                onClick={approvePlan}
              >
                Approve and Diff
              </button>
              <button
                className="rounded border border-line px-4 py-2 text-sm font-semibold text-graphite disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canExecute}
                onClick={executePreview}
              >
                Generate Preview
              </button>
              <button
                className="rounded border border-line px-4 py-2 text-sm font-semibold text-graphite disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!plan}
                onClick={runVerification}
              >
                Run Verification
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {plan ? <PlanPanel plan={plan} /> : <EmptyPanel title="No Plan Yet" body="Create a plan to review impact, risk, steps, and validation gates." />}

          {diff ? (
            <div className="rounded border border-line bg-white p-5">
              <h3 className="text-lg font-semibold text-ink">Diff Preview</h3>
              <div className="mt-4 space-y-3">
                {diff.files.map((file) => (
                  <details key={file.path} className="rounded border border-line bg-cloud p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-ink">{file.path}</summary>
                    <p className="mt-2 text-sm text-graphite">{file.summary}</p>
                    <pre className="mt-3 max-h-72 overflow-auto rounded bg-ink p-3 text-xs leading-5 text-white">{file.after}</pre>
                  </details>
                ))}
              </div>
            </div>
          ) : null}

          {preview ? (
            <div className="rounded border border-line bg-white p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-ink">Live Preview</h3>
                  <p className="mt-1 text-sm text-steel">{preview.description}</p>
                </div>
                <StatusPill label={`${preview.files.length} files`} />
              </div>
              <iframe
                className="h-[560px] w-full rounded border border-line bg-white"
                sandbox=""
                srcDoc={preview.html}
                title="Generated website preview"
              />
            </div>
          ) : null}

          {verification ? (
            <div className="rounded border border-line bg-white p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-ink">Verification Results</h3>
                <StatusPill label={`${verification.verification.total} checks`} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {verification.verification.checks.map((check) => (
                  <div key={check.id} className="rounded border border-line bg-cloud p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">{check.title}</p>
                      <StatusPill label={check.status} tone={check.status} />
                    </div>
                    {check.notes ? <p className="mt-2 text-xs leading-5 text-graphite">{check.notes}</p> : null}
                  </div>
                ))}
              </div>
              {verification.output.length > 0 ? (
                <pre className="mt-4 max-h-56 overflow-auto rounded bg-ink p-3 text-xs leading-5 text-white">
                  {verification.output.join("\n\n")}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-line bg-cloud p-2">
      <p className="text-lg font-semibold text-ink">{value}</p>
      <p className="text-xs text-steel">{label}</p>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded border border-line bg-white p-5">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-graphite">{body}</p>
    </div>
  );
}
