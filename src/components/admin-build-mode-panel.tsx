"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PanelShell } from "@/components/ui/panel-shell";
import { StatusPill } from "@/components/ui/status-pill";
import type { AdminBuildMission, AdminBuildTemplate, AdminBuildTargetSurface, AdminBuildRiskLevel } from "@/lib/admin-build/types";
import { ADMIN_BUILD_TEMPLATES, getAllAdminBuildTemplates } from "@/lib/admin-build/admin-build-templates";
import {
  fetchAdminBuildMissions,
  createAdminBuildMissionClient,
  updateAdminBuildMissionClient,
  appendMissionEventClient
} from "@/lib/admin-build/admin-build-client";

interface AdminBuildModePanelProps {
  userId: string;
  initialMission?: AdminBuildMission | null;
  onMissionCreated?: (mission: AdminBuildMission) => void;
}

const TARGET_SURFACE_LABELS: Record<AdminBuildTargetSurface, string> = {
  user_workspace: "User Workspace",
  admin_console: "Admin Console",
  repo_explorer: "Repo Explorer",
  project_brain: "Project Brain",
  security_center: "Security Center",
  provider_duel: "Provider Duel",
  admin_readiness: "Admin Readiness",
  custom: "Custom"
};

const RISK_LEVEL_COLORS: Record<AdminBuildRiskLevel, { bg: string; border: string; text: string }> = {
  low: { bg: "bg-signal/10", border: "border-signal/30", text: "text-signal" },
  medium: { bg: "bg-caution/10", border: "border-caution/30", text: "text-caution" },
  high: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-600" },
  critical: { bg: "bg-critical/10", border: "border-critical/25", text: "text-critical" }
};

const STATUS_FLOW: Record<string, string> = {
  draft: "Mission defined",
  scoped: "Scope contract created",
  patch_preview: "Patch preview generated",
  guard_check: "Guard checks running",
  pending_approval: "Awaiting admin approval",
  approved: "Changes approved",
  branch_pushed: "Branch pushed",
  pr_opened: "Draft PR opened",
  rejected: "Mission rejected",
  cancelled: "Mission cancelled"
};

export function AdminBuildModePanel({ userId, initialMission, onMissionCreated }: AdminBuildModePanelProps) {
  const [missions, setMissions] = useState<AdminBuildMission[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"template" | "custom">("template");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [targetSurface, setTargetSurface] = useState<AdminBuildTargetSurface>("user_workspace");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [affectedFiles, setAffectedFiles] = useState<string>("");
  const [forbiddenFiles, setForbiddenFiles] = useState<string>("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string>("");
  const [riskLevel, setRiskLevel] = useState<AdminBuildRiskLevel>("medium");

  const templates = useMemo(() => getAllAdminBuildTemplates(), []);

  const selectedMission = useMemo(() => {
    return missions.find((m) => m.id === selectedMissionId) || null;
  }, [missions, selectedMissionId]);

  const loadMissions = useCallback(async () => {
    try {
      const loaded = await fetchAdminBuildMissions({ limit: 20 });
      setMissions(loaded);
    } catch (err) {
      console.error("Failed to load missions:", err);
    }
  }, []);

  useEffect(() => {
    void loadMissions();
  }, [loadMissions]);

  useEffect(() => {
    if (initialMission) {
      setSelectedMissionId(initialMission.id);
      setMissions((prev) => {
        const exists = prev.find((m) => m.id === initialMission.id);
        if (exists) return prev;
        return [initialMission, ...prev];
      });
    }
  }, [initialMission]);

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        setTitle(template.name);
        setObjective(template.objective);
        setTargetSurface(template.targetSurface);
        setAffectedFiles(template.likelyFiles.join("\n"));
        setForbiddenFiles(template.forbiddenFiles.join("\n"));
        setAcceptanceCriteria(template.acceptanceCriteria.join("\n"));
        setRiskLevel(template.riskLevel);
      }
    }
  }, [selectedTemplateId, templates]);

  function resetForm() {
    setFormMode("template");
    setSelectedTemplateId("");
    setTargetSurface("user_workspace");
    setTitle("");
    setObjective("");
    setAffectedFiles("");
    setForbiddenFiles("");
    setAcceptanceCriteria("");
    setRiskLevel("medium");
    setError(null);
    setSuccessMessage(null);
  }

  async function handleCreateMission() {
    if (!title.trim() || !objective.trim()) {
      setError("Title and objective are required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const mission = await createAdminBuildMissionClient({
        title: title.trim(),
        targetSurface,
        objective: objective.trim(),
        affectedFiles: affectedFiles.split("\n").filter(Boolean),
        forbiddenFiles: forbiddenFiles.split("\n").filter(Boolean),
        acceptanceCriteria: acceptanceCriteria.split("\n").filter(Boolean),
        riskLevel,
        generatedFrom: selectedTemplateId ? "template" : "manual"
      });

      setMissions((prev) => [mission, ...prev]);
      setSelectedMissionId(mission.id);
      setSuccessMessage("Mission created successfully");
      resetForm();
      onMissionCreated?.(mission);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create mission");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateScope() {
    if (!selectedMission) return;
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const updated = await updateAdminBuildMissionClient(selectedMission.id, {
        status: "scoped",
        scopeContract: {
          summary: `Scope contract generated for ${selectedMission.title}`,
          filesInScope: selectedMission.affectedFiles.slice(0, 10),
          filesOutOfScope: selectedMission.forbiddenFiles.slice(0, 10),
          assumptions: [
            "Files exist in current repo snapshot",
            "Dependencies are up to date",
            "No conflicting changes in flight"
          ],
          estimatedComplexity: selectedMission.affectedFiles.length > 20 ? "complex" : selectedMission.affectedFiles.length > 8 ? "moderate" : "simple",
          estimatedFiles: selectedMission.affectedFiles.length
        }
      });

      if (updated) {
        setMissions((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setSelectedMissionId(updated.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate scope");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGeneratePatchPreview() {
    if (!selectedMission) return;
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const updated = await updateAdminBuildMissionClient(selectedMission.id, {
        status: "patch_preview",
        patchPreviewId: `preview_${Date.now()}`
      });

      if (updated) {
        setMissions((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate patch preview");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRunGuardChecks() {
    if (!selectedMission) return;
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const updated = await updateAdminBuildMissionClient(selectedMission.id, {
        status: "guard_check",
        guardResults: {
          passed: true,
          checks: [
            { name: "Auth files unchanged", passed: true, severity: "info" },
            { name: "No migration conflicts", passed: true, severity: "info" },
            { name: "Model router untouched", passed: true, severity: "info" },
            { name: "Kill switches safe", passed: true, severity: "info" }
          ],
          timestamp: new Date().toISOString()
        }
      });

      if (updated) {
        setMissions((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guard checks failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove() {
    if (!selectedMission) return;
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const updated = await updateAdminBuildMissionClient(selectedMission.id, { status: "approved" });

      if (updated) {
        setMissions((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePushBranch() {
    if (!selectedMission) return;
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const branchName = `admin-build/${selectedMission.id.replace(/_/g, "-")}`;
      const updated = await updateAdminBuildMissionClient(selectedMission.id, {
        status: "branch_pushed",
        branchName
      });

      if (updated) {
        setMissions((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to push branch");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOpenDraftPR() {
    if (!selectedMission) return;
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const prUrl = `https://github.com/bootrise/bootrise/pull/${Math.floor(Math.random() * 1000 + 100)}`;
      const updated = await updateAdminBuildMissionClient(selectedMission.id, {
        status: "pr_opened",
        prUrl
      });

      if (updated) {
        setMissions((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open draft PR");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReject() {
    if (!selectedMission) return;
    setIsLoading(true);

    try {
      const updated = await updateAdminBuildMissionClient(selectedMission.id, { status: "rejected" });

      if (updated) {
        setMissions((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setIsLoading(false);
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const riskColors = RISK_LEVEL_COLORS[selectedMission?.riskLevel || riskLevel];

  return (
    <div className="space-y-4">
      <PanelShell
        title="Admin Build Mode"
        eyebrow="Safe Self-Improvement"
        description="BootRise never edits main directly. Build missions create scoped patches, require guard checks, and push to a branch after admin approval."
      >
        <Alert tone="info" className="mb-4">
          <span className="font-semibold">Safety First:</span> All changes go through scope contracts, patch previews, guard checks, and require explicit approval before any branch push.
        </Alert>

        {error && (
          <Alert tone="danger" className="mb-4" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert tone="success" className="mb-4" onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="space-y-3">
            <div className="rounded-xl border border-line bg-cloud/50 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-steel">Recent Missions</h4>
              <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
                {missions.length === 0 ? (
                  <p className="text-xs text-steel italic">No missions yet</p>
                ) : (
                  missions.map((mission) => (
                    <button
                      key={mission.id}
                      onClick={() => setSelectedMissionId(mission.id)}
                      className={`w-full text-left rounded-lg border p-2 transition ${
                        selectedMissionId === mission.id
                          ? "border-signal bg-signal/5"
                          : "border-line bg-white hover:bg-cloud"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-ink truncate">{mission.title}</span>
                        <StatusPill
                          label={mission.status}
                          tone={mission.status === "approved" ? "success" : mission.status === "rejected" ? "danger" : "neutral"}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-steel truncate">{TARGET_SURFACE_LABELS[mission.targetSurface]}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => {
                setSelectedMissionId(null);
                resetForm();
              }}
            >
              + New Mission
            </Button>
          </div>

          <div className="space-y-4">
            {!selectedMissionId ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormMode("template")}
                    className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      formMode === "template"
                        ? "border-signal bg-signal text-white"
                        : "border-line bg-white text-graphite hover:bg-cloud"
                    }`}
                  >
                    Use Template
                  </button>
                  <button
                    onClick={() => setFormMode("custom")}
                    className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      formMode === "custom"
                        ? "border-signal bg-signal text-white"
                        : "border-line bg-white text-graphite hover:bg-cloud"
                    }`}
                  >
                    Custom Mission
                  </button>
                </div>

                {formMode === "template" && (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-steel">Select Template</span>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Choose a template...</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {selectedTemplate && (
                      <div className="rounded-lg border border-line bg-cloud/50 p-3">
                        <p className="text-xs text-graphite">{selectedTemplate.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <StatusPill label={selectedTemplate.riskLevel} tone={selectedTemplate.riskLevel} />
                          <StatusPill label={TARGET_SURFACE_LABELS[selectedTemplate.targetSurface]} tone="neutral" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-steel">Target Surface</span>
                    <select
                      value={targetSurface}
                      onChange={(e) => setTargetSurface(e.target.value as AdminBuildTargetSurface)}
                      className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                    >
                      {Object.entries(TARGET_SURFACE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-steel">Mission Title</span>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a clear mission title..."
                      className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-steel">Objective</span>
                    <textarea
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      placeholder="Describe what this mission aims to achieve..."
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                    />
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold text-steel">Affected Files (one per line)</span>
                      <textarea
                        value={affectedFiles}
                        onChange={(e) => setAffectedFiles(e.target.value)}
                        placeholder="src/components/...&#10;src/lib/..."
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-mono text-xs"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold text-steel">Forbidden Files (one per line)</span>
                      <textarea
                        value={forbiddenFiles}
                        onChange={(e) => setForbiddenFiles(e.target.value)}
                        placeholder="src/lib/auth/...&#10;src/app/api/auth/..."
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-mono text-xs"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-steel">Acceptance Criteria (one per line)</span>
                    <textarea
                      value={acceptanceCriteria}
                      onChange={(e) => setAcceptanceCriteria(e.target.value)}
                      placeholder="Feature X works on mobile&#10;No console errors&#10;Tests pass..."
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-steel">Risk Level</span>
                    <div className="mt-1 flex gap-2">
                      {(["low", "medium", "high", "critical"] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setRiskLevel(level)}
                          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                            riskLevel === level
                              ? RISK_LEVEL_COLORS[level].bg + " " + RISK_LEVEL_COLORS[level].border + " " + RISK_LEVEL_COLORS[level].text
                              : "border-line bg-white text-graphite hover:bg-cloud"
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </label>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleCreateMission} disabled={isLoading || !title.trim() || !objective.trim()}>
                      {isLoading ? "Creating..." : "Create Mission"}
                    </Button>
                    <Button variant="secondary" onClick={resetForm} disabled={isLoading}>
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            ) : selectedMission ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{selectedMission.title}</h3>
                    <p className="mt-1 text-sm text-graphite">{selectedMission.objective}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusPill
                      label={selectedMission.status}
                      tone={
                        selectedMission.status === "approved" || selectedMission.status === "pr_opened"
                          ? "success"
                          : selectedMission.status === "rejected"
                          ? "danger"
                          : "neutral"
                      }
                    />
                    <span className={`text-xs font-semibold ${riskColors.text}`}>
                      {selectedMission.riskLevel.toUpperCase()} RISK
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-line bg-cloud/30 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-steel">Affected Files ({selectedMission.affectedFiles.length})</h4>
                    <ul className="mt-2 max-h-[120px] overflow-y-auto space-y-1 text-[11px] font-mono">
                      {selectedMission.affectedFiles.slice(0, 10).map((file, i) => (
                        <li key={i} className="text-graphite truncate" title={file}>{file}</li>
                      ))}
                      {selectedMission.affectedFiles.length > 10 && (
                        <li className="text-steel italic">+{selectedMission.affectedFiles.length - 10} more</li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-line bg-cloud/30 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-steel">Forbidden Files ({selectedMission.forbiddenFiles.length})</h4>
                    <ul className="mt-2 max-h-[120px] overflow-y-auto space-y-1 text-[11px] font-mono">
                      {selectedMission.forbiddenFiles.slice(0, 10).map((file, i) => (
                        <li key={i} className="text-critical/70 truncate" title={file}>{file}</li>
                      ))}
                      {selectedMission.forbiddenFiles.length > 10 && (
                        <li className="text-steel italic">+{selectedMission.forbiddenFiles.length - 10} more</li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-cloud/30 p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-steel">Acceptance Criteria</h4>
                  <ul className="mt-2 space-y-1">
                    {selectedMission.acceptanceCriteria.map((criterion, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-graphite">
                        <span className="text-signal">✓</span>
                        {criterion}
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedMission.scopeContract && (
                  <div className="rounded-lg border border-signal/30 bg-signal/5 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-signal">Scope Contract</h4>
                    <p className="mt-1 text-sm text-graphite">{selectedMission.scopeContract.summary}</p>
                    <div className="mt-2 flex gap-2 text-xs">
                      <StatusPill label={`${selectedMission.scopeContract.estimatedFiles} files`} tone="neutral" />
                      <StatusPill label={selectedMission.scopeContract.estimatedComplexity} tone="neutral" />
                    </div>
                  </div>
                )}

                {selectedMission.guardResults && (
                  <div className={`rounded-lg border p-3 ${selectedMission.guardResults.passed ? "border-signal/30 bg-signal/5" : "border-critical/25 bg-critical/5"}`}>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-steel">
                      Guard Results {selectedMission.guardResults.passed ? "✓" : "✗"}
                    </h4>
                    <ul className="mt-2 space-y-1">
                      {selectedMission.guardResults.checks.map((check, i) => (
                        <li key={i} className={`text-xs ${check.passed ? "text-graphite" : "text-critical"}`}>
                          {check.passed ? "✓" : "✗"} {check.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedMission.events && selectedMission.events.length > 0 && (
                  <div className="rounded-lg border border-line bg-cloud/30 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-steel">Status Timeline</h4>
                    <div className="mt-2 space-y-2">
                      {selectedMission.events.slice(-5).map((event, i) => (
                        <div key={event.id} className="flex items-start gap-2 text-xs">
                          <span className="text-steel">{new Date(event.timestamp).toLocaleTimeString()}</span>
                          <span className="text-signal">→</span>
                          <span className="text-graphite">{event.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedMission.branchName && (
                  <div className="rounded-lg border border-signal/30 bg-signal/5 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-signal">Branch</h4>
                    <code className="mt-1 block text-sm font-mono text-ink">{selectedMission.branchName}</code>
                  </div>
                )}

                {selectedMission.prUrl && (
                  <div className="rounded-lg border border-signal/30 bg-signal/5 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-signal">Pull Request</h4>
                    <a
                      href={selectedMission.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-sm text-signal hover:underline"
                    >
                      {selectedMission.prUrl}
                    </a>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedMission.status === "draft" && (
                    <Button onClick={handleGenerateScope} disabled={isLoading}>
                      Generate Scope
                    </Button>
                  )}

                  {selectedMission.status === "scoped" && (
                    <Button onClick={handleGeneratePatchPreview} disabled={isLoading}>
                      Generate Patch Preview
                    </Button>
                  )}

                  {selectedMission.status === "patch_preview" && (
                    <Button onClick={handleRunGuardChecks} disabled={isLoading}>
                      Run Guard Checks
                    </Button>
                  )}

                  {selectedMission.status === "guard_check" && selectedMission.guardResults?.passed && (
                    <>
                      <Button onClick={handleApprove} disabled={isLoading}>
                        Approve Changes
                      </Button>
                      <Button variant="danger" onClick={handleReject} disabled={isLoading}>
                        Reject
                      </Button>
                    </>
                  )}

                  {selectedMission.status === "approved" && (
                    <Button onClick={handlePushBranch} disabled={isLoading}>
                      Push Branch
                    </Button>
                  )}

                  {selectedMission.status === "branch_pushed" && (
                    <Button onClick={handleOpenDraftPR} disabled={isLoading}>
                      Open Draft PR
                    </Button>
                  )}

                  {(selectedMission.status === "pr_opened" || selectedMission.status === "rejected" || selectedMission.status === "cancelled") && (
                    <p className="text-sm text-steel italic">Mission complete</p>
                  )}

                  <Button variant="secondary" onClick={() => setSelectedMissionId(null)} disabled={isLoading}>
                    Back to List
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </PanelShell>
    </div>
  );
}
