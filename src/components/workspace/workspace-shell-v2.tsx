"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDefaultProjectBrief } from "@/lib/workspace/project-launch";
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
import { RuntimeMonitorPanel } from "@/components/runtime-monitor-panel";
import type { WorkspaceAgentDecision } from "@/components/workspace/agent-decision-card";
import type { WorkspaceProvider, WorkspaceRole, WorkspaceSpeed } from "@/components/workspace/mode-popover";
import type { ArchitectureRoadmap, ProjectBrief, WorkspaceFixReport } from "@/lib/workspace/workspace-types";
import type { WorkUnitPlan } from "@/lib/workspace/work-unit-planner";
import type { DeploymentReadinessResult, SecurityFinding } from "@/lib/security/types";
import { deriveOnboardingState, type OnboardingState } from "@/lib/onboarding/onboarding-state";
import type { ProviderDuelResult } from "@/lib/ai/provider-duel";
import type { ProjectBrainV2 } from "@/lib/project-brain/project-brain-v2";
import type { MultiPassExecutionResult } from "@/lib/workspace/work-unit-state";
import type { ProductBrain } from "@/lib/product-brain/product-brain-types";
import type { BootriseJob } from "@/lib/jobs/job-types";
import { buildProductBrainContext } from "@/lib/product-brain/product-brain-context";
import {
  runArchitectConversationAgent,
  type ArchitectConversationResult
} from "@/lib/agents/user/architect-conversation-agent";
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

interface WorkspaceJobEnvelope {
  job?: BootriseJob;
  error?: string;
}

export function WorkspaceShellV2({ initialProjectId = null }: { initialProjectId?: string | null }) {
  const [activeStep, setActiveStep] = useState<WorkspaceV2Step>("connect");
  const [githubUrl, setGithubUrl] = useState("https://github.com/Esta-Lux/SnapRoad-Beta-Functional");
  const [githubBranch, setGithubBranch] = useState("main");
  const [githubBranches, setGithubBranches] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<"full" | "key">("full");
  const [projectName, setProjectName] = useState("My startup");
  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
  const [brief, setBrief] = useState<ProjectBrief>(createDefaultProjectBrief);
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
  const [projectBrain, setProjectBrain] = useState<ProjectBrainV2 | null>(null);
  const [productBrain, setProductBrain] = useState<ProductBrain | null>(null);
  const [architectConversation, setArchitectConversation] = useState<ArchitectConversationResult | null>(null);
  const [architectAssumptionsApproved, setArchitectAssumptionsApproved] = useState(false);
  const [multiPassExecution, setMultiPassExecution] = useState<MultiPassExecutionResult | null>(null);
  const [multiPassRunId, setMultiPassRunId] = useState<string | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [runtimeRefreshToken, setRuntimeRefreshToken] = useState(0);
  const roadmapRequestRef = useRef<string | null>(null);

  const apiFiles = useMemo(() => toApiWorkspaceFiles(workspaceFiles), [workspaceFiles]);
  const effectiveProjectId = projectId ?? repositoryId;
  const repoConnected = workspaceFiles.length > 0;
  const changedPaths = useMemo(
    () => [...new Set([...getChangedWorkspaceFiles(workspaceFiles).map((file) => file.path), ...(report?.patches?.map((patch) => patch.path) ?? [])])],
    [workspaceFiles, report]
  );

  const recordRuntimeContinuity = useCallback(
    async (message: string, likelyFiles?: string[]) => {
      if (!effectiveProjectId) return;
      try {
        await fetch("/api/workspace/runtime/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ projectId: effectiveProjectId, message, likelyFiles })
        });
        setRuntimeRefreshToken((value) => value + 1);
      } catch {
        /* noop */
      }
    },
    [effectiveProjectId]
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
    if (!initialProjectId) return;
    void loadProject(initialProjectId);
  }, [initialProjectId]);

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

  const refreshRoadmap = useCallback(async () => {
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
          productBrain,
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
  }, [apiFiles, brief, productBrain, report]);

  const refreshProjectBrain = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          repositoryId: effectiveProjectId ?? "workspace_repo",
          files: apiFiles
        })
      });
      const data = (await res.json()) as { brainV2?: ProjectBrainV2 };
      if (!res.ok) return;
      setProjectBrain(data.brainV2 ?? null);
    } catch {
      setProjectBrain(null);
    }
  }, [effectiveProjectId, apiFiles]);

  const waitForWorkspaceJob = useCallback(
    async <T,>(jobId: string, fallbackError: string): Promise<T> => {
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const res = await fetch(`/api/workspace/jobs?jobId=${encodeURIComponent(jobId)}`, { credentials: "include" });
        const data = (await res.json().catch(() => ({}))) as WorkspaceJobEnvelope;
        if (!res.ok || !data.job) throw new Error(data.error ?? fallbackError);
        if (data.job.status === "failed") throw new Error(data.job.error ?? fallbackError);
        if (data.job.progressMessage) setStatus(data.job.progressMessage);
        if (data.job.status === "completed") return (data.job.result ?? {}) as T;
        await new Promise((resolve) => window.setTimeout(resolve, 400));
      }
      throw new Error("Job timed out. Try again.");
    },
    []
  );

  const refreshProductBrain = useCallback(
    async (correction?: string) => {
      if (!effectiveProjectId) return;
      try {
        const res = await fetch("/api/workspace/product-brain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            projectId: effectiveProjectId,
            brief,
            files: apiFiles,
            correction
          })
        });
        const data = (await res.json()) as { jobId?: string; error?: string };
        if (!res.ok || !data.jobId) throw new Error(data.error ?? "Product Brain failed.");
        const job = await waitForWorkspaceJob<{ productBrain?: ProductBrain }>(data.jobId, "Product Brain failed.");
        setProductBrain(job.productBrain ?? null);
      } catch {
        setProductBrain(null);
      }
    },
    [effectiveProjectId, brief, apiFiles, waitForWorkspaceJob]
  );

  useEffect(() => {
    if (!repoConnected || !briefReady) return;
    void refreshRoadmap();
  }, [briefReady, repoConnected, refreshRoadmap]);

  useEffect(() => {
    if (!repoConnected) return;
    void refreshProjectBrain();
  }, [repoConnected, refreshProjectBrain]);

  useEffect(() => {
    if (!repoConnected || !effectiveProjectId) return;
    void refreshProductBrain();
  }, [repoConnected, effectiveProjectId, refreshProductBrain]);

  async function loadProject(id: string) {
    setBusy(true);
    setStatus("Loading project");
    try {
      const res = await fetch(`/api/workspace/projects?id=${encodeURIComponent(id)}`, { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        project?: {
          id: string;
          name: string;
          brief: ProjectBrief;
          files: WorkspaceFile[];
          lastReport: WorkspaceFixReport | null;
          preferredProvider: WorkspaceProvider;
          githubUrl?: string | null;
          repositoryId?: string | null;
        };
        error?: string;
      };
      if (!res.ok || !data.project) throw new Error(data.error ?? "Project not found.");
      setProjectId(data.project.id);
      setProjectName(data.project.name);
      setBrief(data.project.brief);
      setWorkspaceFiles(createWorkspaceFileStates(data.project.files ?? []));
      setSelectedPath(data.project.files?.[0]?.path);
      setReport(data.project.lastReport ?? null);
      setProvider(data.project.preferredProvider ?? "bootrise");
      setGithubUrl(data.project.githubUrl ?? "");
      setRepositoryId(data.project.repositoryId ?? null);
      setIssue(null);
      setStatus(data.project.files?.length ? "Project loaded" : "Project ready for import");
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Project load failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function persistProjectSnapshot(overrides?: {
    name?: string;
    brief?: ProjectBrief;
    files?: WorkspaceFile[];
    repositoryId?: string | null;
    githubUrl?: string | null;
    lastReport?: WorkspaceFixReport | null;
  }) {
    const name = overrides?.name?.trim() || projectName.trim() || "Untitled project";
    const nextBrief = overrides?.brief ?? {
      ...brief,
      productName: brief.productName.trim() || name,
      primaryWorkflow: brief.primaryWorkflow.trim() || "Ship the core user workflow"
    };
    const res = await fetch("/api/workspace/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id: projectId ?? undefined,
        name,
        brief: nextBrief,
        files: overrides?.files ?? apiFiles,
        lastReport: overrides?.lastReport ?? report ?? undefined,
        preferredProvider: provider,
        githubUrl: overrides?.githubUrl ?? githubUrl ?? null,
        repositoryId: overrides?.repositoryId ?? repositoryId ?? null
      })
    });
    const data = (await res.json().catch(() => ({}))) as { project?: { id: string }; error?: string };
    if (!res.ok || !data.project?.id) {
      throw new Error(data.error ?? "Project save failed.");
    }
    setProjectId(data.project.id);
    return data.project.id;
  }

  useEffect(() => {
    setArchitectConversation(
      runArchitectConversationAgent({
        task: fixRequest,
        workUnitPlan,
        productContext: buildProductBrainContext(productBrain)
      })
    );
    setArchitectAssumptionsApproved(false);
  }, [fixRequest, workUnitPlan, productBrain]);

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
      const repoName = githubUrl.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ?? "Imported project";
      const nextBrief = brief.productName.trim()
        ? brief
        : { ...brief, productName: repoName, primaryWorkflow: brief.primaryWorkflow || "Ship the core user workflow" };
      const nextProjectName = projectName.trim() || repoName;
      setWorkspaceFiles(createWorkspaceFileStates(nextFiles));
      setRepositoryId(data.repositoryId ?? repositoryId ?? `repo_${Date.now()}`);
      setProjectId(data.projectId ?? projectId);
      setGithubBranch(data.branch ?? githubBranch);
      setSelectedPath(nextFiles[0]?.path);
      setBrief(nextBrief);
      setProjectName(nextProjectName);
      await persistProjectSnapshot({
        name: nextProjectName,
        brief: nextBrief,
        files: nextFiles,
        repositoryId: data.repositoryId ?? repositoryId ?? null,
        githubUrl: githubUrl.trim()
      });
      setActiveStep("brief");
      setIssue(null);
      setStatus("Repository imported");
      setDraftPrMessage(null);
      setMultiPassExecution(null);
      void recordRuntimeContinuity("Repository import completed and workspace files are loaded.", nextFiles.slice(0, 6).map((file) => file.path));
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
    if (
      architectConversation &&
      architectConversation.classification !== "clear_to_build" &&
      !architectAssumptionsApproved
    ) {
      return setIssue(architectConversation.question ?? "Approve architect assumptions before patching this request.");
    }
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
          projectId: effectiveProjectId ?? undefined,
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
      void recordRuntimeContinuity("Fix report generated and pending approval.", data.report.patches?.map((patch) => patch.path));
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
          repoFiles: apiFiles,
          productBrainContext: productBrain ? JSON.stringify(buildProductBrainContext(productBrain)) : undefined
        })
      });
      const data = (await res.json()) as { workUnitPlan?: WorkUnitPlan; error?: string };
      if (!res.ok || !data.workUnitPlan) throw new Error(data.error ?? "Work unit planning failed.");
      setWorkUnitPlan(data.workUnitPlan);
      setMultiPassExecution(null);
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

  async function runMultiPassExecution() {
    if (!workUnitPlan?.requiresMultiPass) return proceedWithScopedFix();
    if (
      architectConversation &&
      architectConversation.classification !== "clear_to_build" &&
      !architectAssumptionsApproved
    ) {
      return setIssue(architectConversation.question ?? "Approve architect assumptions before multi-pass execution.");
    }
    setBusy(true);
    setStatus("Running multi-pass executor");
    try {
      const res = await fetch("/api/workspace/multi-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          taskDescription: fixRequest,
          workUnitPlan,
          repoFiles: apiFiles,
          repositoryId: repositoryId ?? undefined
        })
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "Multi-pass execution failed.");
      const job = await waitForWorkspaceJob<{ result?: MultiPassExecutionResult; runId?: string; report?: WorkspaceFixReport }>(
        data.jobId,
        "Multi-pass execution failed."
      );
      if (!job.result) throw new Error("Multi-pass execution failed.");
      const result = job.result;
      setMultiPassExecution(result);
      setMultiPassRunId(job.runId ?? null);
      if (result.status === "blocked") {
        setStatus("Blocked");
        setIssue(result.blockers[0] ?? "Work unit execution was blocked.");
        return;
      }
      if (job.report) {
        setReport(job.report);
      }
      setStatus("Multi-pass execution complete");
      setIssue(null);
      setWorkUnitApproved(true);
      setActiveStep("verify");
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Multi-pass execution failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function rerunWorkUnit(workUnitId: string) {
    if (!multiPassRunId) return setIssue("Run multi-pass once before re-running a unit.");
    setBusy(true);
    setStatus(`Re-running ${workUnitId}`);
    try {
      const res = await fetch("/api/workspace/multi-pass/rerun-unit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          runId: multiPassRunId,
          workUnitId
        })
      });
      const data = (await res.json()) as { result?: MultiPassExecutionResult; runId?: string; report?: WorkspaceFixReport; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error ?? "Work unit rerun failed.");
      setMultiPassExecution(data.result);
      setMultiPassRunId(data.runId ?? multiPassRunId);
      if (data.report) {
        setReport(data.report);
      }
      setIssue(data.result.status === "blocked" ? data.result.blockers[0] ?? "Work unit rerun blocked." : null);
      setStatus(data.result.status === "blocked" ? "Blocked" : "Work unit rerun complete");
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Work unit rerun failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  function simplifyFixRequest() {
    setWorkUnitPlan(null);
    setMultiPassExecution(null);
    setMultiPassRunId(null);
    setWorkUnitApproved(false);
    setStatus("Ready");
  }

  function approveArchitectAssumptions() {
    setArchitectAssumptionsApproved(true);
    void refreshProductBrain(`Approved assumption: ${architectConversation?.question ?? architectConversation?.message ?? "Architect assumptions approved."}`);
    setIssue(null);
    setStatus("Architect assumptions approved");
  }

  function saveProductBrainCorrection(input: string) {
    void refreshProductBrain(input);
    setStatus("Product Brain updated");
    setIssue(null);
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
      void recordRuntimeContinuity(
        `Sandbox verify ${data.status === "passed" ? "passed" : "completed"} with ${data.commands?.length ?? 0} command(s).`,
        apiFiles.slice(0, 6).map((file) => file.path)
      );
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
      const nextFiles = Array.isArray(data.files)
        ? data.files
        : applyReportPatchesToWorkspaceFileStates(workspaceFiles, approvedReport).map((file) => ({
            path: file.path,
            content: file.currentContent
          }));
      setReport(approvedReport);

      if (Array.isArray(data.files)) {
        setWorkspaceFiles(createWorkspaceFileStates(data.files));
      } else {
        setWorkspaceFiles((current) => applyReportPatchesToWorkspaceFileStates(current, approvedReport));
      }
      await persistProjectSnapshot({ files: nextFiles, lastReport: approvedReport, repositoryId: repositoryId ?? null });

      setIssue(null);
      setStatus("Patch approved");
      setActiveStep("verify");
      void recordRuntimeContinuity("Patch approved and moved to verify step.", approvedReport.patches?.map((patch) => patch.path));
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
      await persistProjectSnapshot({ lastReport: null, repositoryId: repositoryId ?? null });
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
          projectId: effectiveProjectId ?? report.repositoryId,
          commitMessage: input?.commitMessage,
          prTitle: input?.prTitle,
          prBody:
            input?.prBody ??
            [
              "# BootRise Draft PR",
              "",
              "## Product intent",
              productBrain?.oneLineDescription ?? brief.primaryWorkflow ?? "Not provided",
              "",
              "## Definition of done",
              ...(productBrain?.definitionOfDone?.slice(0, 5).map((item) => `- ${item}`) ?? ["- Follow existing workspace safety checklist"])
            ].join("\n"),
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
        body: JSON.stringify({ files: apiFiles, projectId: effectiveProjectId ?? undefined })
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "Security scan failed.");
      const job = await waitForWorkspaceJob<{ findings?: SecurityFinding[]; score?: number; criticalCount?: number }>(
        data.jobId,
        "Security scan failed."
      );
      setSecurityFindings(job.findings ?? []);
      setSecurityScore(typeof job.score === "number" ? job.score : null);
      setSecurityCriticalCount(typeof job.criticalCount === "number" ? job.criticalCount : 0);
      setIssue(null);
      setStatus("Security scan complete");
      void recordRuntimeContinuity(`Security scan complete. Critical findings: ${job.criticalCount ?? 0}.`, job.findings?.slice(0, 6).map((finding) => finding.file).filter(Boolean) as string[]);
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
        body: JSON.stringify({ files: apiFiles, projectId: effectiveProjectId ?? undefined })
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "Deployment readiness failed.");
      const job = await waitForWorkspaceJob<{ report?: DeploymentReadinessResult }>(data.jobId, "Deployment readiness failed.");
      if (!job.report) throw new Error("Deployment readiness failed.");
      setDeploymentReadiness(job.report);
      setDeploymentCheckedAt(new Date().toLocaleString());
      setIssue(null);
      setStatus("Deploy readiness complete");
      void recordRuntimeContinuity(`Deploy readiness ${job.report.status.replace(/_/g, " ")}.`, job.report.blockers.slice(0, 6).map((finding) => finding.file).filter(Boolean) as string[]);
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
          projectId: effectiveProjectId ?? undefined,
          repositoryId: repositoryId ?? undefined,
          premiumAllowed: provider === "openai" || speed === "premium",
          productContext: buildProductBrainContext(productBrain)
        })
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "Provider Duel failed.");
      const job = await waitForWorkspaceJob<{ results?: ProviderDuelResult[] }>(data.jobId, "Provider Duel failed.");
      setProviderDuelResults(job.results ?? []);
      setIssue(null);
      setStatus("Provider Duel complete");
      void recordRuntimeContinuity("Provider duel comparison completed.", apiFiles.slice(0, 6).map((file) => file.path));
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Provider Duel failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  const agentDecisions: WorkspaceAgentDecision[] = useMemo(
    () => [
        {
          id: "architect",
          name: "Architect Agent",
          status: roadmap ? "passed" : roadmapLoading ? "running" : repoConnected ? "idle" : "blocked",
          summary: roadmap ? "Roadmap created and app type detected." : "Waiting for repository + brief to build roadmap.",
          blockedReason: !repoConnected ? "Connect repository first." : undefined
        },
        {
          id: "brain",
          name: "Project Brain Agent",
          status: projectBrain ? "passed" : repoConnected ? "running" : "idle",
          summary: projectBrain ? `Indexed ${projectBrain.indexedFiles} files with ${projectBrain.summary.totalApiRoutes} routes.` : "Building symbol, route, and env maps."
        },
        {
          id: "product-brain",
          name: "Product Brain Agent",
          status: productBrain ? "passed" : repoConnected ? "running" : "idle",
          summary: productBrain ? `Tracking ${productBrain.primaryWorkflows.length} workflow(s) and ${productBrain.policies.length} policies.` : "Building product memory from brief and repository context."
        },
        {
          id: "architect-conversation",
          name: "Architect Conversation Agent",
          status:
            architectConversation?.classification === "clear_to_build"
              ? "passed"
              : architectAssumptionsApproved
                ? "passed"
                : fixRequest.trim()
                  ? "running"
                  : "idle",
          summary: architectConversation?.message ?? "Classifies risk and asks clarifying questions before patching."
        },
        {
          id: "scope",
          name: "Scope Agent",
          status: workUnitPlan ? "passed" : fixRequest.trim() ? "running" : "idle",
          summary: workUnitPlan ? "Work-unit scope is locked for controlled execution." : "Scope locks start after planning."
        },
        {
          id: "builder",
          name: "Builder Agent",
          status: report?.patches?.length ? "passed" : busy && activeStep === "fix" ? "running" : "idle",
          summary: report?.patches?.length ? `${report.patches.length} patch(es) prepared.` : "Patch pending."
        },
        {
          id: "security",
          name: "Security Agent",
          status: securityCriticalCount && securityCriticalCount > 0 ? "blocked" : securityFindings ? "passed" : "idle",
          summary: securityFindings ? "Security scan completed." : "Security scan not run.",
          blockedReason: securityCriticalCount && securityCriticalCount > 0 ? `${securityCriticalCount} critical findings.` : undefined
        },
        {
          id: "qa",
          name: "QA Agent",
          status: sandboxLog ? "passed" : activeStep === "verify" && busy ? "running" : "idle",
          summary: sandboxLog ? "Completion checks finished." : "Verify is pending."
        },
        {
          id: "deploy",
          name: "Deployment Agent",
          status: deployStatus === "failed" ? "blocked" : deployStatus === "ready" ? "passed" : "idle",
          summary: deploymentReadiness?.status ? `Deployment readiness: ${deploymentReadiness.status.replace(/_/g, " ")}.` : "Deploy readiness not run.",
          blockedReason: deployStatus === "failed" ? "Deployment readiness blockers detected." : undefined
        }
      ],
    [roadmap, roadmapLoading, repoConnected, projectBrain, productBrain, architectConversation, architectAssumptionsApproved, workUnitPlan, fixRequest, report, busy, activeStep, securityCriticalCount, securityFindings, sandboxLog, deployStatus, deploymentReadiness]
  );

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-surface-ws text-text-ws-1">
      <WorkspaceTopbarV2 projectName={projectName} creditsRemaining={creditsRemaining} projectId={projectId} />
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
          <section className="border-t border-border-ws px-6 py-4">
            <RuntimeMonitorPanel
              projectId={effectiveProjectId}
              refreshToken={runtimeRefreshToken}
              onSuggestFix={(suggestedRequest) => {
                setFixRequest(suggestedRequest);
                setActiveStep("fix");
                setStatus("Loaded continuity suggestion");
              }}
            />
          </section>
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
          projectBrain={projectBrain}
          productBrain={productBrain}
          architectConversation={architectConversation}
          assumptionsApproved={architectAssumptionsApproved}
          multiPassExecution={multiPassExecution}
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
          onRunMultiPassExecution={runMultiPassExecution}
          onSimplifyFixRequest={simplifyFixRequest}
          onRunSecurityScan={runSecurityScan}
          onRunDeploymentReadiness={runDeploymentReadiness}
          onRunProviderDuel={runProviderDuel}
          onRerunWorkUnit={rerunWorkUnit}
          onSaveProductBrainCorrection={saveProductBrainCorrection}
          onApproveArchitectAssumptions={approveArchitectAssumptions}
          agentDecisions={agentDecisions}
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
