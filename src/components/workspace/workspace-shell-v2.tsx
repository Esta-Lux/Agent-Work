"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BlockerRow } from "@/components/ui/blocker-row";
import { CommandButton } from "@/components/ui/command-button";
import { OnboardingChecklist } from "@/components/workspace/onboarding-checklist";
import { OperationPanelV2 } from "@/components/workspace/operation-panel-v2";
import { RepoFileEditor } from "@/components/workspace/repo-file-editor";
import { RepoFileExplorer, type FileNode } from "@/components/workspace/repo-file-explorer";
import { WorkspaceCommandStrip } from "@/components/workspace/workspace-command-strip";
import { WorkspaceDiffViewer, type DiffFile } from "@/components/workspace/workspace-diff-viewer";
import { WorkspaceTopbarV2 } from "@/components/workspace/workspace-topbar-v2";
import { WorkflowRailV2, type WorkspaceV2Step } from "@/components/workspace/workflow-rail-v2";
import type { WorkspaceProvider, WorkspaceRole, WorkspaceSpeed } from "@/components/workspace/mode-popover";
import type { ArchitectureRoadmap, ProjectBrief, WorkspaceFixReport } from "@/lib/workspace/workspace-types";
import type { WorkUnitPlan } from "@/lib/workspace/work-unit-planner";
import type { DeploymentReadinessResult, SecurityFinding } from "@/lib/security/types";
import { deriveOnboardingState, type OnboardingState } from "@/lib/onboarding/onboarding-state";
import type { ProviderDuelResult } from "@/lib/ai/provider-duel";
import {
  createWorkspaceFileStates,
  getChangedWorkspaceFiles,
  resetWorkspaceFile,
  toApiWorkspaceFiles,
  updateWorkspaceFile,
  type WorkspaceFileState
} from "@/lib/workspace/workspace-file-state";

interface WorkspaceFile {
  path: string;
  content: string;
}

interface ProviderHealth {
  provider: "bootrise" | "openai";
  connected: boolean;
}

interface CreditsResponse {
  balance?: { remaining?: number } | number;
  credits?: number;
  remaining?: number;
}

const defaultBrief: ProjectBrief = {
  productName: "",
  audience: "",
  primaryWorkflow: "",
  authRequired: false,
  paymentsRequired: false,
  deploymentTarget: "vercel",
  constraints: [],
  longBuild: false
};

export function WorkspaceShellV2() {
  const [activeStep, setActiveStep] = useState<WorkspaceV2Step>("connect");
  const [githubUrl, setGithubUrl] = useState("https://github.com/Esta-Lux/SnapRoad-Beta-Functional");
  const [githubBranch, setGithubBranch] = useState("main");
  const [githubBranches, setGithubBranches] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<"full" | "key">("full");
  const [projectName, setProjectName] = useState("My startup");
  const [brief, setBrief] = useState<ProjectBrief>(defaultBrief);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFileState[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  const [repositoryId, setRepositoryId] = useState<string | null>(null);
  const [fixRequest, setFixRequest] = useState("");
  const [report, setReport] = useState<WorkspaceFixReport | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [role, setRole] = useState<WorkspaceRole>("architect");
  const [provider, setProvider] = useState<WorkspaceProvider>("bootrise");
  const [speed, setSpeed] = useState<WorkspaceSpeed>("fast");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [issue, setIssue] = useState<string | null>(null);
  const [offlineDismissed, setOfflineDismissed] = useState(false);
  const [sandboxLog, setSandboxLog] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<ArchitectureRoadmap | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [draftPrMessage, setDraftPrMessage] = useState<string | null>(null);
  const [workUnitPlan, setWorkUnitPlan] = useState<WorkUnitPlan | null>(null);
  const [workUnitApproved, setWorkUnitApproved] = useState(false);
  const [securityFindings, setSecurityFindings] = useState<SecurityFinding[] | null>(null);
  const [securityScore, setSecurityScore] = useState<number | null>(null);
  const [securityCriticalCount, setSecurityCriticalCount] = useState<number | null>(null);
  const [deploymentReadiness, setDeploymentReadiness] = useState<DeploymentReadinessResult | null>(null);
  const [deploymentCheckedAt, setDeploymentCheckedAt] = useState<string | null>(null);
  const [providerDuelResults, setProviderDuelResults] = useState<ProviderDuelResult[]>([]);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const roadmapRequestRef = useRef<string | null>(null);

  const apiFiles = useMemo(() => toApiWorkspaceFiles(workspaceFiles), [workspaceFiles]);
  const repoConnected = workspaceFiles.length > 0;
  const changedPaths = useMemo(
    () => [...new Set([...getChangedWorkspaceFiles(workspaceFiles).map((file) => file.path), ...(report?.patches?.map((patch) => patch.path) ?? [])])],
    [workspaceFiles, report]
  );
  const fileTree = useMemo(() => buildTree(apiFiles, changedPaths), [apiFiles, changedPaths]);
  const selectedFile = workspaceFiles.find((file) => file.path === selectedPath);
  const diff = useMemo(() => reportToDiff(report), [report]);
  const providerConfigured = providerHealth.find((item) => item.provider === provider)?.connected ?? true;
  const briefReady = Boolean(brief.productName.trim() && brief.primaryWorkflow.trim());
  const controlBlocked = Boolean(report?.controlLayer && !report.controlLayer.canApprove);
  const safeToPr = report?.safeToPr?.status === "yes" || report?.approvalStatus === "approved";
  const securityBlockers = roadmap?.deploymentBlockers.length ?? 0;
  const deployStatus =
    !roadmap ? "unknown" : roadmap.deploymentBlockers.length > 0 || roadmap.productionReadiness === "blocked" ? "failed" : "ready";
  const onboardingState: OnboardingState = deriveOnboardingState({
    repoConnected,
    brainIndexed: repoConnected,
    roadmapReady: Boolean(roadmap),
    fixRequest,
    hasReport: Boolean(report),
    patchApproved: report?.approvalStatus === "approved",
    verified: Boolean(sandboxLog),
    exported: Boolean(exportMessage || draftPrMessage),
    dismissed: onboardingDismissed
  });

  useEffect(() => {
    void refreshPlatform();
  }, []);

  useEffect(() => {
    if (!repoConnected || !briefReady) return;
    void refreshRoadmap();
  }, [apiFiles, brief, briefReady, repoConnected, report]);

  async function refreshPlatform() {
    try {
      const [providersRes, creditsRes] = await Promise.all([fetch("/api/ai/providers/health"), fetch("/api/workspace/credits", { credentials: "include" })]);
      const providersJson = (await providersRes.json()) as { providers?: ProviderHealth[] };
      const creditsJson = (await creditsRes.json()) as CreditsResponse;
      setProviderHealth(providersJson.providers ?? []);
      setCreditsRemaining(readCreditsRemaining(creditsJson));
    } catch {
      setProviderHealth([]);
    }
  }

  async function refreshRoadmap() {
    const requestKey = JSON.stringify({
      files: apiFiles.map((file) => ({ path: file.path, content: file.content })),
      brief,
      approvalStatus: report?.approvalStatus,
      safeToPr: report?.safeToPr?.status,
      controlBlocked: report?.controlLayer?.canApprove
    });
    if (roadmapRequestRef.current === requestKey) return;
    roadmapRequestRef.current = requestKey;
    setRoadmapLoading(true);
    try {
      const res = await fetch("/api/workspace/architecture/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          files: apiFiles,
          brief,
          report: report
            ? {
                approvalStatus: report.approvalStatus,
                safeToPr: report.safeToPr,
                controlLayer: report.controlLayer
              }
            : null
        })
      });
      const data = (await res.json()) as { roadmap?: ArchitectureRoadmap; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Architecture roadmap failed.");
      setRoadmap(data.roadmap ?? null);
    } catch {
      setRoadmap(null);
      roadmapRequestRef.current = null;
    } finally {
      setRoadmapLoading(false);
    }
  }

  async function loadBranches() {
    if (!githubUrl.trim()) return setIssue("Enter a GitHub URL before loading branches.");
    setBusy(true);
    try {
      const res = await fetch(`/api/workspace/github/branches?url=${encodeURIComponent(githubUrl.trim())}`);
      const data = (await res.json()) as { branches?: string[]; defaultBranch?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Branch lookup failed.");
      setGithubBranches(data.branches ?? []);
      setGithubBranch(data.defaultBranch ?? data.branches?.[0] ?? githubBranch);
      setIssue(null);
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Branch lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function importRepo() {
    if (!githubUrl.trim()) return setIssue("Enter a GitHub URL before importing.");
    setBusy(true);
    setStatus("Importing repository");
    try {
      const res = await fetch("/api/workspace/github/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remoteUrl: githubUrl.trim(), branch: githubBranch, repositoryId: repositoryId ?? undefined, mode: importMode })
      });
      const data = (await res.json()) as { files?: WorkspaceFile[]; repositoryId?: string; projectId?: string; branch?: string; mode?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Import failed.");
      const nextFiles = data.files ?? [];
      setWorkspaceFiles(createWorkspaceFileStates(nextFiles));
      setRepositoryId(data.repositoryId ?? repositoryId ?? `repo_${Date.now()}`);
      setGithubBranch(data.branch ?? githubBranch);
      setSelectedPath(nextFiles[0]?.path);
      if (!brief.productName.trim()) {
        const repoName = githubUrl.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ?? "Imported project";
        setBrief((value) => ({ ...value, productName: repoName, primaryWorkflow: value.primaryWorkflow || "Ship the core user workflow" }));
        setProjectName(repoName);
      }
      setActiveStep("brief");
      setIssue(null);
      setStatus("Repository imported");
      setDraftPrMessage(null);
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Import failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function runFix(options?: { skipWorkUnitPlanning?: boolean }) {
    if (!repoConnected) return setIssue("Connect a repo before running Fix.");
    if (!fixRequest.trim()) return setIssue("Describe one scoped change before running Fix.");
    if (!options?.skipWorkUnitPlanning && !workUnitApproved) {
      const planned = await planWorkUnitsForFix();
      if (planned?.requiresMultiPass) return;
    }
    setBusy(true);
    setStatus("Running Fix");
    try {
      const res = await fetch("/api/workspace/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request: fixRequest,
          files: apiFiles,
          provider,
          mode: speed,
          projectId: repositoryId ?? undefined,
          repositoryId: repositoryId ?? undefined,
          assumptionsApproved: false,
          premiumApproved: provider === "openai" || speed === "premium"
        })
      });
      const data = (await res.json()) as { report?: WorkspaceFixReport; repositoryId?: string; pendingFixId?: string; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Fix failed.");
      setReport(data.report);
      setWorkUnitPlan(null);
      setWorkUnitApproved(false);
      setRepositoryId(data.repositoryId ?? data.report.repositoryId ?? repositoryId);
      setActiveStep("verify");
      setIssue(null);
      setStatus("Fix report ready");
      setDraftPrMessage(null);
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Fix failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function planWorkUnitsForFix(): Promise<WorkUnitPlan | null> {
    setBusy(true);
    setStatus("Planning work units");
    try {
      const res = await fetch("/api/workspace/work-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          taskDescription: fixRequest,
          scopedFiles: selectedPath ? [selectedPath] : [],
          repoFiles: apiFiles
        })
      });
      const data = (await res.json()) as { workUnitPlan?: WorkUnitPlan; error?: string };
      if (!res.ok || !data.workUnitPlan) throw new Error(data.error ?? "Work unit planning failed.");
      setWorkUnitPlan(data.workUnitPlan);
      setStatus(data.workUnitPlan.requiresMultiPass ? "Work unit plan ready" : "Work unit plan clear");
      if (!data.workUnitPlan.requiresMultiPass) {
        setWorkUnitApproved(true);
      }
      setIssue(null);
      return data.workUnitPlan;
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Work unit planning failed.");
      setStatus("Blocked");
      return null;
    } finally {
      setBusy(false);
    }
  }

  function proceedWithScopedFix() {
    setWorkUnitApproved(true);
    void runFix({ skipWorkUnitPlanning: true });
  }

  function simplifyFixRequest() {
    setWorkUnitPlan(null);
    setWorkUnitApproved(false);
    setStatus("Ready");
  }

  async function runVerify() {
    if (!repoConnected) return setIssue("Connect a repo before running Verify.");
    setBusy(true);
    setStatus("Sandbox verify");
    try {
      const res = await fetch("/api/workspace/sandbox/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: apiFiles, repositoryId: repositoryId ?? undefined })
      });
      const data = (await res.json()) as { status?: string; commands?: Array<{ label: string; exitCode: number; output: string }>; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Verify failed.");
      setSandboxLog(data.commands?.map((command) => `${command.label} (${command.exitCode})\n${command.output}`).join("\n\n") ?? data.message ?? data.status ?? "Verification completed.");
      setActiveStep("export");
      setIssue(null);
      setStatus(data.status === "passed" ? "Verified" : "Verify completed");
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Verify failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function exportBundle() {
    if (!briefReady) return setIssue("Complete product name and primary workflow before exporting.");
    setBusy(true);
    setStatus("Preparing export");
    try {
      const res = await fetch("/api/workspace/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "download", projectBrief: brief, files: apiFiles, plan: report?.plan, report: report ?? undefined, repositoryId: repositoryId ?? undefined, preferredProvider: provider })
      });
      const data = (await res.json()) as { message?: string; downloadUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Export failed.");
      setExportMessage(data.message ?? data.downloadUrl ?? "Export bundle is ready.");
      setIssue(null);
      setStatus("Export ready");
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Export failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  function primaryAction() {
    if (!repoConnected || activeStep === "connect") void importRepo();
    else if (activeStep === "brief") setActiveStep("fix");
    else if (activeStep === "fix" && workUnitPlan?.requiresMultiPass) proceedWithScopedFix();
    else if (activeStep === "fix") void runFix();
    else if (activeStep === "verify") void runVerify();
    else void exportBundle();
  }

  async function approvePatch() {
    if (!report?.pendingFixId) {
      setIssue("No pending fix is available to approve.");
      return;
    }

    setBusy(true);
    setStatus("Approving patch");

    try {
      const res = await fetch("/api/workspace/fix/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pendingFixId: report.pendingFixId,
          repositoryId: repositoryId ?? report.repositoryId ?? undefined
        })
      });

      const data = (await res.json()) as { report?: WorkspaceFixReport; files?: WorkspaceFile[]; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Patch approval failed.");
      }

      const approvedReport = data.report ?? report;
      setReport(approvedReport);

      if (Array.isArray(data.files)) {
        setWorkspaceFiles(createWorkspaceFileStates(data.files));
      } else {
        setWorkspaceFiles((current) => applyReportPatchesToWorkspaceFileStates(current, report));
      }

      setIssue(null);
      setStatus("Patch approved");
      setActiveStep("verify");
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Patch approval failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function rejectPatch() {
    if (!report?.pendingFixId) {
      setReport(null);
      setStatus("Patch rejected");
      return;
    }

    setBusy(true);
    setStatus("Rejecting patch");

    try {
      const res = await fetch("/api/workspace/fix/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pendingFixId: report.pendingFixId,
          repositoryId: repositoryId ?? report.repositoryId ?? undefined
        })
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Patch rejection failed.");
      }

      setReport(null);
      setIssue(null);
      setStatus("Patch rejected");
      setActiveStep("fix");
      setDraftPrMessage(null);
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Patch rejection failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function openDraftPr(input?: { commitMessage?: string; prTitle?: string; prBody?: string; draft?: boolean }) {
    if (!report?.pendingFixId) return setIssue("Approve a pending fix before opening a draft PR.");
    if (report.approvalStatus !== "approved") return setIssue("Approve the patch before opening a draft PR.");
    if (!githubUrl.trim()) return setIssue("Connect a GitHub repository before opening a draft PR.");

    setBusy(true);
    setStatus("Opening draft PR");
    try {
      const res = await fetch("/api/workspace/github/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pendingFixId: report.pendingFixId,
          remoteUrl: githubUrl.trim(),
          branch: githubBranch,
          projectId: repositoryId ?? report.repositoryId,
          commitMessage: input?.commitMessage,
          prTitle: input?.prTitle,
          prBody: input?.prBody,
          draft: input?.draft ?? true
        })
      });
      const data = (await res.json()) as {
        draftPr?: { prUrl?: string; prNumber?: number };
        push?: { compareUrl?: string; branch?: string };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Draft PR creation failed.");
      const message =
        data.draftPr?.prUrl ??
        data.push?.compareUrl ??
        `Draft PR opened from ${data.push?.branch ?? "the BootRise branch"}.`;
      setDraftPrMessage(message);
      setIssue(null);
      setStatus("Draft PR opened");
      setActiveStep("export");
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Draft PR creation failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function runSecurityScan() {
    if (!repoConnected) return setIssue("Connect a repo before running a security scan.");
    setBusy(true);
    setStatus("Running security scan");
    try {
      const res = await fetch("/api/workspace/security/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ files: apiFiles, projectId: repositoryId ?? undefined })
      });
      const data = (await res.json()) as { findings?: SecurityFinding[]; score?: number; criticalCount?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Security scan failed.");
      setSecurityFindings(data.findings ?? []);
      setSecurityScore(typeof data.score === "number" ? data.score : null);
      setSecurityCriticalCount(typeof data.criticalCount === "number" ? data.criticalCount : 0);
      setIssue(null);
      setStatus("Security scan complete");
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Security scan failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function runDeploymentReadiness() {
    if (!repoConnected) return setIssue("Connect a repo before running deployment readiness.");
    setBusy(true);
    setStatus("Running deploy readiness");
    try {
      const res = await fetch("/api/workspace/deploy/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ files: apiFiles })
      });
      const data = (await res.json()) as { report?: DeploymentReadinessResult; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? "Deployment readiness failed.");
      setDeploymentReadiness(data.report);
      setDeploymentCheckedAt(new Date().toLocaleString());
      setIssue(null);
      setStatus("Deploy readiness complete");
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Deployment readiness failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function runProviderDuel() {
    if (!fixRequest.trim()) return setIssue("Describe a task before running Provider Duel.");
    setBusy(true);
    setStatus("Comparing providers");
    try {
      const res = await fetch("/api/workspace/provider-duel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          task: fixRequest,
          files: apiFiles,
          premiumAllowed: provider === "openai" || speed === "premium"
        })
      });
      const data = (await res.json()) as { results?: ProviderDuelResult[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Provider Duel failed.");
      setProviderDuelResults(data.results ?? []);
      setIssue(null);
      setStatus("Provider Duel complete");
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Provider Duel failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-surface-ws text-text-ws-1">
      <WorkspaceTopbarV2 projectName={projectName} creditsRemaining={creditsRemaining} />
      {!providerConfigured && !offlineDismissed ? (
        <div className="border-b border-amber-400/25 bg-amber-400/10 px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <BlockerRow severity="warning" title="BootRise engine offline" description="Chat works in offline mode. Full AI review needs NVIDIA_API_KEY in .env.local and a restart." />
            <CommandButton theme="workspace" variant="ghost" size="sm" label="Dismiss" onClick={() => setOfflineDismissed(true)} />
          </div>
        </div>
      ) : null}
      <WorkspaceCommandStrip
        projectName={projectName}
        repoConnected={repoConnected}
        activeStep={activeStep}
        creditsRemaining={creditsRemaining}
        brainIndexed={repoConnected}
        controlBlocked={controlBlocked}
        securityBlockers={securityBlockers}
        safeToPr={safeToPr}
        deployStatus={deployStatus}
        busy={busy}
        role={role}
        provider={provider}
        speed={speed}
        onRoleChange={setRole}
        onProviderChange={setProvider}
        onSpeedChange={setSpeed}
        onPrimaryAction={primaryAction}
        onShowOnboarding={() => {
          setOnboardingDismissed(false);
          setTourOpen(true);
        }}
      />
      {tourOpen ? <OnboardingChecklist state={onboardingState} mode="tour" onDismiss={() => setTourOpen(false)} /> : null}
      <div className="grid min-h-[calc(100vh-244px)] flex-1 grid-cols-[220px_minmax(0,1fr)_320px]">
        <WorkflowRailV2 activeStep={activeStep} repoConnected={repoConnected} onStepChange={(step) => (!repoConnected && step !== "connect" ? undefined : setActiveStep(step))} />
        <main data-tour="file-workspace" className="min-w-0 bg-surface-ws">
          {repoConnected ? (
            <div className="grid h-full min-h-[520px] grid-cols-[260px_minmax(0,1fr)]">
              <RepoFileExplorer files={fileTree} selectedPath={selectedPath} onSelect={setSelectedPath} />
              <div className="min-w-0 overflow-y-auto">
                {diff.length > 0 && activeStep !== "brief" ? (
                  <WorkspaceDiffViewer
                    diff={diff}
                    onApprove={isPendingReport(report) ? approvePatch : undefined}
                    onReject={isPendingReport(report) ? rejectPatch : undefined}
                  />
                ) : selectedFile ? (
                  <RepoFileEditor
                    path={selectedFile.path}
                    content={selectedFile.currentContent}
                    status={selectedFile.status}
                    riskLevel={selectedFile.riskLevel}
                    onChange={(content) => setWorkspaceFiles((current) => updateWorkspaceFile(current, selectedFile.path, content, "manual"))}
                    onReset={() => setWorkspaceFiles((current) => resetWorkspaceFile(current, selectedFile.path))}
                  />
                ) : (
                  <div className="p-6 text-sm text-text-ws-3">Select a file to inspect.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <p className="font-serif text-3xl italic text-text-ws-1">Connect real code to begin</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-text-ws-2">BootRise will keep JSON internal and guide work around imported repository files.</p>
              </div>
            </div>
          )}
        </main>
        <OperationPanelV2
          activeStep={activeStep}
          repoConnected={repoConnected}
          githubUrl={githubUrl}
          githubBranch={githubBranch}
          githubBranches={githubBranches}
          importMode={importMode}
          projectName={projectName}
          brief={brief}
          fixRequest={fixRequest}
          status={status}
          issue={issue}
          provider={provider}
          speed={speed}
          sandboxLog={sandboxLog}
          exportMessage={exportMessage}
          roadmap={roadmap}
          roadmapLoading={roadmapLoading}
          report={report}
          draftPrMessage={draftPrMessage}
          workUnitPlan={workUnitPlan}
          securityFindings={securityFindings}
          securityScore={securityScore}
          securityCriticalCount={securityCriticalCount}
          deploymentReadiness={deploymentReadiness}
          deploymentCheckedAt={deploymentCheckedAt}
          providerDuelResults={providerDuelResults}
          busy={busy}
          onGithubUrlChange={setGithubUrl}
          onGithubBranchChange={setGithubBranch}
          onImportModeChange={setImportMode}
          onProjectNameChange={setProjectName}
          onBriefChange={setBrief}
          onFixRequestChange={setFixRequest}
          onLoadBranches={loadBranches}
          onOpenDocs={() => window.open("/docs/GITHUB_APP.md", "_blank", "noreferrer")}
          onOpenDraftPr={openDraftPr}
          onProceedWithScopedFix={proceedWithScopedFix}
          onSimplifyFixRequest={simplifyFixRequest}
          onRunSecurityScan={runSecurityScan}
          onRunDeploymentReadiness={runDeploymentReadiness}
          onRunProviderDuel={runProviderDuel}
        />
      </div>
    </div>
  );
}

function isPendingReport(report: WorkspaceFixReport | null): boolean {
  return Boolean(report?.pendingFixId && (!report.approvalStatus || report.approvalStatus === "pending_approval"));
}

function buildTree(files: WorkspaceFile[], changedPaths: string[]): FileNode[] {
  const root: FileNode[] = [];
  const dirs = new Map<string, FileNode>();
  const changed = new Set(changedPaths);
  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let collection = root;
    let currentPath = "";
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === parts.length - 1;
      if (isFile) {
        collection.push({ path: file.path, type: "file", changed: changed.has(file.path) });
      } else {
        let dir = dirs.get(currentPath);
        if (!dir) {
          dir = { path: currentPath, type: "dir", children: [] };
          dirs.set(currentPath, dir);
          collection.push(dir);
        }
        collection = dir.children ?? [];
      }
    }
  }
  return root;
}

function readCreditsRemaining(data: CreditsResponse): number | null {
  if (typeof data.remaining === "number") return data.remaining;
  if (typeof data.credits === "number") return data.credits;
  if (typeof data.balance === "number") return data.balance;
  if (typeof data.balance?.remaining === "number") return data.balance.remaining;
  return null;
}

function applyReportPatchesToWorkspaceFileStates(
  files: WorkspaceFileState[],
  report: WorkspaceFixReport | null
): WorkspaceFileState[] {
  if (!report?.patches?.length) return files;

  let next = files;

  for (const patch of report.patches) {
    next = updateWorkspaceFile(next, patch.path, patch.after, "ai_patch");
  }

  return next;
}

function reportToDiff(report: WorkspaceFixReport | null): DiffFile[] {
  if (!report?.patches?.length) return [];
  return report.patches.map((patch) => ({
    path: patch.path,
    hunks: [
      {
        header: "@@ proposed patch @@",
        lines: [
          ...patch.before.split("\n").slice(0, 40).map((content) => ({ type: "remove" as const, content })),
          ...patch.after.split("\n").slice(0, 40).map((content) => ({ type: "add" as const, content }))
        ]
      }
    ]
  }));
}
