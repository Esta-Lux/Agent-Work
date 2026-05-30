"use client";

import { useEffect, useMemo, useState } from "react";
import { ADMIN_BUILD_TEMPLATES } from "@/lib/admin-build/admin-build-templates";
import type { AdminBuildMission, AdminBuildTemplate } from "@/lib/admin-build/types";
import { BlockerRow } from "@/components/ui/blocker-row";
import { CommandButton } from "@/components/ui/command-button";
import { MissionCard } from "@/components/ui/mission-card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusPill } from "@/components/ui/status-pill";

interface GithubStatus {
  connected?: boolean;
  installationId?: string | null;
  account?: string | null;
  error?: string;
}

interface SelfAgentScope {
  missionId: string;
  workUnits: Array<{
    id: string;
    label: string;
    domain: string;
    targetFiles: string[];
    readOnlyFiles: string[];
    description: string;
    riskLevel: "low" | "medium" | "high";
  }>;
  totalFilesAffected: number;
  estimatedRiskLevel: "low" | "medium" | "high";
  scopeSummary: string;
  safetyNote: string;
}

export function SelfAgentPage() {
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [missions, setMissions] = useState<AdminBuildMission[]>([]);
  const [templateId, setTemplateId] = useState(ADMIN_BUILD_TEMPLATES[0]?.id ?? "");
  const selectedTemplate = useMemo(
    () => ADMIN_BUILD_TEMPLATES.find((template) => template.id === templateId) ?? ADMIN_BUILD_TEMPLATES[0],
    [templateId]
  );
  const [title, setTitle] = useState(selectedTemplate?.name ?? "");
  const [objective, setObjective] = useState(selectedTemplate?.objective ?? "");
  const [targetBranch, setTargetBranch] = useState("bootrise/self-agent-draft");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<SelfAgentScope | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/github/status")
      .then((res) => res.json())
      .then((data: GithubStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ connected: false, error: "GitHub status unavailable." });
      });
    void loadMissions(cancelled);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedTemplate) return;
    setTitle(selectedTemplate.name);
    setObjective(selectedTemplate.objective);
  }, [selectedTemplate]);

  async function loadMissions(cancelled = false) {
    try {
      const res = await fetch("/api/admin/build-missions?limit=10");
      const data = (await res.json()) as { missions?: AdminBuildMission[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Mission load failed.");
      if (!cancelled) setMissions(data.missions ?? []);
    } catch (caught) {
      if (!cancelled) setError(caught instanceof Error ? caught.message : "Mission load failed.");
    }
  }

  async function planMissionScope() {
    setBusy(true);
    setError(null);
    setMessage(null);
    setScope(null);
    try {
      const res = await fetch("/api/admin/self-agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission: {
            title,
            description: objective,
            targetBranch
          }
        })
      });
      const data = (await res.json()) as { adminBuildMission?: AdminBuildMission; scope?: SelfAgentScope; error?: string };
      if (!res.ok || !data.adminBuildMission || !data.scope) throw new Error(data.error ?? "Scope planning failed.");
      setMissions((current) => [data.adminBuildMission as AdminBuildMission, ...current.filter((mission) => mission.id !== data.adminBuildMission?.id)].slice(0, 10));
      setScope(data.scope);
      setMessage(`Scope planned for ${targetBranch}. Patch generation is intentionally not started yet.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Scope planning failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        theme="admin"
        eyebrow="SELF-AGENT"
        title="BootRise improves itself"
        description="BootRise never edits main directly. Self-agent missions create scoped patch requests, run guard checks later, and require admin approval before code moves forward."
      />
      <section className="grid gap-4 xl:grid-cols-3">
        <StatusCard title="Self repo" value={status?.connected ? status.account ?? "Connected" : "Disconnected"} variant={status?.connected ? "signal" : "amber"} />
        <StatusCard title="Provider" value="Mission creation works without generating patches" variant="amber" />
        <StatusCard title="Target branch" value={targetBranch || "not set"} variant={targetBranch ? "signal" : "amber"} />
      </section>
      {status?.error ? <BlockerRow severity="warning" title="GitHub status unavailable" description={status.error} /> : null}
      {isProtectedBranch(targetBranch) ? <BlockerRow severity="critical" title="Protected branch blocked" description="Self-Agent missions cannot target branch names containing main or master." /> : null}
      {error ? <BlockerRow severity="warning" title="Self-Agent action failed" description={error} /> : null}
      {message ? <BlockerRow severity="info" title="Mission staged" description={message} /> : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-border-admin bg-panel-admin p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-widest text-text-admin-3">Mission composer</p>
              <h2 className="mt-1 text-base font-semibold text-text-admin-1">Create a scoped improvement mission</h2>
              <p className="mt-1 text-sm text-text-admin-2">This creates a draft mission only. No patch generation or branch push starts from this screen.</p>
            </div>
            {selectedTemplate ? <StatusPill variant={riskVariant(selectedTemplate.riskLevel)} label={`${selectedTemplate.riskLevel} risk`} /> : null}
          </div>

          <div className="mt-5 grid gap-4">
            <Field label="Template">
              <select className="h-10 w-full rounded-lg border border-border-admin bg-white px-3 text-sm text-text-admin-1" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                {ADMIN_BUILD_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mission title">
              <input className="h-10 w-full rounded-lg border border-border-admin bg-white px-3 text-sm text-text-admin-1" value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field label="Objective">
              <textarea className="min-h-32 w-full rounded-lg border border-border-admin bg-white px-3 py-2 text-sm leading-6 text-text-admin-1" value={objective} onChange={(event) => setObjective(event.target.value)} />
            </Field>
            <Field label="Target branch label">
              <input className="h-10 w-full rounded-lg border border-border-admin bg-white px-3 font-mono text-sm text-text-admin-1" value={targetBranch} onChange={(event) => setTargetBranch(event.target.value)} />
            </Field>
            <div className="flex justify-end">
              <CommandButton theme="admin" variant="primary" size="md" label="Plan mission scope" loading={busy} disabled={!title.trim() || !objective.trim() || !targetBranch.trim() || isProtectedBranch(targetBranch)} onClick={planMissionScope} />
            </div>
          </div>
        </div>

        {selectedTemplate ? <TemplatePreview template={selectedTemplate} /> : null}
      </section>

      {scope ? <ScopePreview scope={scope} /> : null}

      <section className="rounded-lg border border-border-admin bg-panel-admin p-4">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-text-admin-3">Mission surfaces</p>
        <p className="mt-2 text-sm text-text-admin-2">No mission running yet. Create a mission to unlock plan, diff, trace, verify, agents, and memory.</p>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {[
            ["Plan", "Create a mission to generate a scope next."],
            ["Diff", "Patch preview has not been generated yet."],
            ["Trace", "No execution events yet."],
            ["Verify", "No verification run yet."],
            ["Agents", "Waiting for mission."],
            ["Memory", "Mission history will appear here."]
          ].map(([tab, copy]) => (
            <div key={tab} className="rounded-lg bg-surface-admin px-3 py-3">
              <p className="text-sm font-semibold text-text-admin-1">{tab}</p>
              <p className="mt-1 text-xs leading-5 text-text-admin-2">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border-admin bg-panel-admin p-4">
        <h2 className="text-sm font-semibold text-text-admin-1">Recent missions</h2>
        <div className="mt-3 space-y-2">
          {missions.length === 0 ? (
            <p className="text-sm text-text-admin-3">No missions have been created yet.</p>
          ) : (
            missions.map((mission) => (
              <MissionCard
                key={mission.id}
                id={mission.id}
                title={mission.title}
                status={mission.status === "cancelled" || mission.status === "rejected" ? "blocked" : mission.status === "approved" || mission.status === "branch_pushed" || mission.status === "pr_opened" ? "complete" : "pending"}
                branch={mission.branchName}
                createdAt={mission.createdAt}
                summary={mission.objective}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function TemplatePreview({ template }: { template: AdminBuildTemplate }) {
  return (
    <aside className="rounded-lg border border-border-admin bg-panel-admin p-4">
      <p className="font-mono text-xs font-medium uppercase tracking-widest text-text-admin-3">Scope preview</p>
      <PreviewList title="Affected files" items={template.likelyFiles} />
      <PreviewList title="Forbidden files" items={template.forbiddenFiles} />
      <PreviewList title="Acceptance criteria" items={template.acceptanceCriteria} />
    </aside>
  );
}

function ScopePreview({ scope }: { scope: SelfAgentScope }) {
  return (
    <section className="rounded-lg border border-border-admin bg-panel-admin p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-text-admin-3">Planned scope</p>
          <h2 className="mt-1 text-sm font-semibold text-text-admin-1">{scope.scopeSummary}</h2>
          <p className="mt-1 text-sm text-text-admin-2">{scope.safetyNote}</p>
        </div>
        <StatusPill variant={scope.estimatedRiskLevel === "high" ? "red" : scope.estimatedRiskLevel === "medium" ? "amber" : "signal"} label={`${scope.estimatedRiskLevel} risk`} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {scope.workUnits.map((unit) => (
          <article key={unit.id} className="rounded-lg bg-surface-admin p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-text-admin-1">{unit.label}</p>
              <StatusPill variant={unit.riskLevel === "high" ? "red" : unit.riskLevel === "medium" ? "amber" : "signal"} label={unit.domain} />
            </div>
            <p className="mt-2 text-xs leading-5 text-text-admin-2">{unit.description}</p>
            <PreviewList title="Target files" items={unit.targetFiles} />
            <PreviewList title="Read-only files" items={unit.readOnlyFiles} />
          </article>
        ))}
      </div>
    </section>
  );
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-admin-2">{title}</p>
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <li key={item} className="rounded bg-surface-admin px-2 py-1 font-mono text-[11px] text-text-admin-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-text-admin-3">{label}</span>
      {children}
    </label>
  );
}

function riskVariant(risk: AdminBuildTemplate["riskLevel"]) {
  if (risk === "critical" || risk === "high") return "red";
  if (risk === "medium") return "amber";
  return "signal";
}

function isProtectedBranch(branch: string): boolean {
  return /main|master/i.test(branch.trim());
}

function StatusCard({ title, value, variant }: { title: string; value: string; variant: "signal" | "amber" }) {
  return (
    <article className="rounded-lg border border-border-admin bg-panel-admin p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-admin-1">{title}</p>
        <StatusPill variant={variant} label={variant === "signal" ? "ready" : "setup"} />
      </div>
      <p className="mt-3 text-sm text-text-admin-2">{value}</p>
    </article>
  );
}
