"use client";

import { useEffect, useMemo, useState } from "react";
import { AgentLiveBar } from "@/components/agent-live-bar";
import { ArchitectureMapPanel } from "@/components/architecture-map-panel";
import { DiffReportPanel } from "@/components/diff-report-panel";
import { DeviceStreamPanel } from "@/components/device-stream-panel";
import { WebContainerPreview } from "@/components/webcontainer-preview";
import { PersonaSelector } from "@/components/persona-selector";
import { PlanApprovalPanel } from "@/components/plan-approval-panel";
import { ControlLayerPanel } from "@/components/control-layer-panel";
import { ChatControlBanner } from "@/components/chat-control-banner";
import type { ChatControlSummary } from "@/lib/control/types";
import { ProjectDashboard } from "@/components/project-dashboard";
import { WebPreviewPanel } from "@/components/web-preview-panel";
import { WorkspaceLivingLedger } from "@/components/workspace-living-ledger";
import { ProjectBrainPanel } from "@/components/project-brain-panel";
import { SecurityPanel } from "@/components/security-panel";
import { RuntimeMonitorPanel } from "@/components/runtime-monitor-panel";
import { WorkspaceCommandCenter } from "@/components/workspace-command-center";
import { BlockedStateCard } from "@/components/blocked-state-card";
import { AgentCouncilPanel } from "@/components/agent-council-panel";
import type { BootrisePersonaId } from "@/lib/ai/bootrise-voice";
import { computeSafeToPr } from "@/lib/workspace/safe-to-pr";
import { WorkspaceChatMessage } from "@/components/workspace-chat-message";
import { WorkspaceQuickNav } from "@/components/workspace-quick-nav";
import { selectRelevantFiles, selectReviewBatches } from "@/lib/workspace/workspace-code-context";
import {
  EngineToggle,
  FileTreeExplorer,
  Panel,
  WorkspaceStepRail,
  WorkspaceTabs,
  type WorkspaceStep
} from "@/components/workspace-ui";
import { StatusPill } from "@/components/status-pill";
import {
  FIX_PIPELINE_STEPS,
  type FileActivity,
  type ProjectBrief,
  type RepoHealthSummary,
  type ThinkingStep,
  type WorkspaceFixReport
} from "@/lib/workspace/workspace-types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  phase?: string;
  thinkingSteps?: ThinkingStep[];
  fileActivity?: FileActivity[];
  suggestedActions?: string[];
  plainEnglishSummary?: string;
}

interface ChatApiResponse {
  reply?: string;
  phase?: string;
  thinkingSteps?: ThinkingStep[];
  fileActivity?: FileActivity[];
  suggestedActions?: string[];
  triggerFix?: boolean;
  plainEnglishSummary?: string;
  chatControl?: ChatControlSummary | null;
  error?: string;
}

const EMPTY_FILES = "[]";
const FIX_REQUEST_PLACEHOLDER = /^Describe the change you want/i;

const DEFAULT_BRIEF: ProjectBrief = {
  productName: "",
  audience: "",
  primaryWorkflow: "",
  authRequired: false,
  paymentsRequired: false,
  deploymentTarget: "vercel",
  constraints: [],
  longBuild: false
};

function workspaceFetch(input: string, init?: RequestInit) {
  return fetch(input, { credentials: "include", ...init });
}

const WELCOME: ChatMessage = {
  role: "assistant",
  content: [
    "BootRise stops AI coding agents from breaking large codebases. It scopes the task, controls context, blocks hallucinated edits, verifies the patch, and only applies changes after you approve.",
    "",
    "In this workspace: import a real GitHub repo, chat with role-based AI, then run **Fix** to get a scope lock, context budget, file-touch contract, patch guard, and diff budget before anything touches your files. Approve only when the control layer says it is safe, then verify and export.",
    "",
    "Start in **Connect** with a full repo import, pick a persona above the chat, then ask a specific question or run Fix with a narrow request (e.g. “small fix rewards history UI”)."
  ].join("\n")
};

export function UserWorkspace() {
  const [brief, setBrief] = useState<ProjectBrief>(DEFAULT_BRIEF);
  const [filesInput, setFilesInput] = useState(EMPTY_FILES);
  const [fixRequest, setFixRequest] = useState("Describe the change you want (module, file, or behavior)");
  const [activeStep, setActiveStep] = useState<WorkspaceStep>("connect");
  const [contextTab, setContextTab] = useState("connect");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [chatInput, setChatInput] = useState("");
  const [report, setReport] = useState<WorkspaceFixReport | null>(null);
  const [repositoryId, setRepositoryId] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const [githubUrl, setGithubUrl] = useState("https://github.com/Esta-Lux/SnapRoad-Beta-Functional");
  const [githubBranch, setGithubBranch] = useState("main");
  const [githubBranches, setGithubBranches] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<"key" | "full">("full");
  const [activityDetail, setActivityDetail] = useState<string | null>(null);
  const [sandboxLog, setSandboxLog] = useState<string | null>(null);
  const [provider, setProvider] = useState<"bootrise" | "openai">("bootrise");
  const [modelMode, setModelMode] = useState<"fast" | "deep" | "security" | "premium">("fast");
  const [persona, setPersona] = useState<BootrisePersonaId>("architect");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("My startup");
  const [projects, setProjects] = useState<Array<{ id: string; name: string; updatedAt: string }>>([]);
  const [projectStorage, setProjectStorage] = useState<"supabase" | "local" | "hybrid">("local");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [providerHealth, setProviderHealth] = useState<{ bootrise: boolean; openai: boolean }>({
    bootrise: false,
    openai: false
  });
  const [liveThinking, setLiveThinking] = useState<ThinkingStep[]>([]);
  const [liveFilesInFocus, setLiveFilesInFocus] = useState<string[]>([]);
  const [liveActiveFile, setLiveActiveFile] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [repoHealth, setRepoHealth] = useState<RepoHealthSummary | null>(null);
  const [sandboxPassed, setSandboxPassed] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [lastProjectSaved, setLastProjectSaved] = useState<string | null>(null);
  const [pendingFixId, setPendingFixId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);
  const [devPreviewStatus, setDevPreviewStatus] = useState<string | null>(null);
  const [previewFramework, setPreviewFramework] = useState<string | null>(null);
  const [lastChatControl, setLastChatControl] = useState<ChatControlSummary | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [securityBlockers, setSecurityBlockers] = useState(0);
  const [brainStats, setBrainStats] = useState<{ files: number; modules: number; stale: number } | null>(null);

  const parsedFiles = useMemo(() => {
    try {
      return JSON.parse(filesInput) as Array<{ path: string; content: string }>;
    } catch {
      return [];
    }
  }, [filesInput]);

  const isWorking = /Thinking|Fix pipeline|Importing|Sandbox|Saving|Loading/.test(status);

  const REVIEW_ISSUES_PROMPT =
    "Review this codebase and list all issues, risks, and gaps you see. Use file paths from the repo. Cover backend, mobile, frontend, tests, and docs.";

  useEffect(() => {
    if (!busy || liveFilesInFocus.length === 0) {
      if (!busy) setLiveActiveFile(null);
      return;
    }
    let idx = 0;
    setLiveActiveFile(liveFilesInFocus[0] ?? null);
    const timer = setInterval(() => {
      idx = (idx + 1) % liveFilesInFocus.length;
      setLiveActiveFile(liveFilesInFocus[idx] ?? null);
    }, 900);
    return () => clearInterval(timer);
  }, [busy, liveFilesInFocus]);

  useEffect(() => {
    void (async () => {
      try {
        const [projectsRes, healthRes, creditsRes] = await Promise.all([
          workspaceFetch("/api/workspace/projects"),
          workspaceFetch("/api/ai/providers/health"),
          workspaceFetch("/api/workspace/credits")
        ]);
        const projectsJson = (await projectsRes.json()) as {
          projects?: Array<{ id: string; name: string; updatedAt: string }>;
          storage?: "supabase" | "local" | "hybrid";
        };
        setProjects(projectsJson.projects ?? []);
        if (projectsJson.storage) setProjectStorage(projectsJson.storage);
        const healthJson = (await healthRes.json()) as {
          configured?: { bootrise?: boolean; openai?: boolean };
        };
        setProviderHealth({
          bootrise: Boolean(healthJson.configured?.bootrise),
          openai: Boolean(healthJson.configured?.openai)
        });
        const creditsJson = (await creditsRes.json()) as { balance?: { remaining?: number } };
        setCreditsRemaining(creditsJson.balance?.remaining ?? null);
      } catch {
        /* non-blocking */
      }
    })();
  }, []);

  useEffect(() => {
    if (!projectId) {
      setBrainStats(null);
      return;
    }
    void workspaceFetch(`/api/workspace/brain?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.summary) {
          setBrainStats({
            files: d.summary.fileCount ?? 0,
            modules: d.summary.moduleCount ?? 0,
            stale: d.summary.staleCount ?? 0
          });
        }
      })
      .catch(() => setBrainStats(null));
  }, [projectId]);

  const loadedFilePaths = useMemo(() => parsedFiles.map((f) => f.path).filter(Boolean), [parsedFiles]);
  const hasCode = loadedFilePaths.length > 0;
  const briefReady = brief.productName.trim().length > 0 && brief.primaryWorkflow.trim().length > 0;

  const stepCompleted: Partial<Record<WorkspaceStep, boolean>> = {
    connect: loadedFilePaths.length > 0,
    plan: briefReady || messages.length > 2,
    fix: Boolean(report),
    verify: Boolean(sandboxLog),
    export: exportDone
  };

  async function analyzeWorkspace(files: Array<{ path: string; content: string }>) {
    if (files.length === 0) {
      setRepoHealth(null);
      return;
    }
    try {
      const res = await workspaceFetch("/api/workspace/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files })
      });
      const data = (await res.json()) as { health?: RepoHealthSummary; error?: string };
      if (res.ok && data.health) setRepoHealth(data.health);
    } catch {
      /* non-blocking */
    }
  }

  async function recordLedger(
    kind: "import" | "analyze" | "fix_proposed" | "fix_approved" | "fix_rejected" | "sandbox" | "preview" | "export" | "github_push" | "chat",
    title: string,
    narrative: string
  ) {
    const id = projectId ?? `proj_${repositoryId ?? "session"}`;
    try {
      await workspaceFetch("/api/workspace/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id, kind, title, narrative })
      });
    } catch {
      /* non-blocking */
    }
  }

  function refreshSafeToPr(nextReport: WorkspaceFixReport, passed: boolean) {
    const hasRealRepoPatches =
      nextReport.approvalStatus === "approved" &&
      (nextReport.patches?.length ?? 0) > 0 &&
      !nextReport.fixed.some((f) => f.path.startsWith("generated/"));
    return {
      ...nextReport,
      safeToPr: computeSafeToPr({
        report: nextReport,
        sandboxPassed: passed,
        hasRealRepoPatches
      })
    };
  }

  function updateFileContent(path: string, content: string) {
    const next = parsedFiles.map((f) => (f.path === path ? { ...f, content } : f));
    setFilesInput(JSON.stringify(next, null, 2));
  }

  function parseFiles() {
    return JSON.parse(filesInput) as Array<{ path: string; content: string }>;
  }

  async function saveProject() {
    setBusy(true);
    setError(null);
    setStatus("Saving project");
    try {
      const files = parseFiles();
      const response = await workspaceFetch("/api/workspace/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: projectId ?? undefined,
          name: projectName,
          brief,
          files,
          lastReport: report,
          preferredProvider: provider,
          githubUrl: githubUrl || null
        })
      });
      const data = (await response.json()) as {
        project?: { id: string; name: string; updatedAt: string };
        storage?: "supabase" | "local" | "hybrid";
        cloudSaved?: boolean;
        supabase?: { message?: string };
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Save failed.");
      if (data.project) {
        setProjectId(data.project.id);
        setLastProjectSaved(data.project.updatedAt);
        setProjects((current) => {
          const next = current.filter((p) => p.id !== data.project!.id);
          return [data.project!, ...next];
        });
      }
      if (data.storage) setProjectStorage(data.storage);
      setSaveNotice(data.supabase?.message ?? (data.cloudSaved ? "Saved to Supabase." : "Saved locally."));
      setStatus("Ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function loadProject(id: string) {
    setBusy(true);
    setError(null);
    setStatus("Loading project");
    try {
      const response = await workspaceFetch(`/api/workspace/projects?id=${encodeURIComponent(id)}`);
      const data = (await response.json()) as {
        project?: {
          id: string;
          name: string;
          brief: ProjectBrief;
          files: Array<{ path: string; content: string }>;
          lastReport: WorkspaceFixReport | null;
          preferredProvider: "bootrise" | "openai";
          githubUrl: string | null;
        };
        error?: string;
      };
      if (!response.ok || !data.project) throw new Error(data.error ?? "Load failed.");
      const p = data.project;
      setProjectId(p.id);
      setProjectName(p.name);
      setBrief(p.brief);
      setFilesInput(JSON.stringify(p.files, null, 2));
      setReport(p.lastReport);
      setProvider(p.preferredProvider);
      setGithubUrl(p.githubUrl ?? "");
      setLastProjectSaved(p.id);
      await analyzeWorkspace(p.files);
      setStatus("Ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Load failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function loadGithubBranches() {
    if (!githubUrl.trim()) {
      setError("Enter a GitHub URL first.");
      return;
    }
    setBusy(true);
    setStatus("Loading branches");
    try {
      const res = await workspaceFetch(`/api/workspace/github/branches?url=${encodeURIComponent(githubUrl.trim())}`);
      const data = (await res.json()) as { branches?: Array<{ name: string }>; defaultBranch?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Branch load failed");
      const names = (data.branches ?? []).map((b) => b.name);
      setGithubBranches(names);
      if (data.defaultBranch) setGithubBranch(data.defaultBranch);
      setStatus("Ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Branch load failed");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function importFromGithub() {
    if (!githubUrl.trim()) {
      setError("Enter a GitHub URL first.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(importMode === "full" ? "Importing full repo" : "Importing key files");
    setActivityDetail(importMode === "full" ? "Up to 400 text files · skips node_modules, binaries" : "README + manifests");
    setLiveThinking([
      { id: "gh1", label: "Resolve branch", status: "active" },
      { id: "gh2", label: importMode === "full" ? "List git tree" : "Fetch key paths", status: "pending" },
      { id: "gh3", label: "Download file contents", status: "pending" },
      { id: "gh4", label: "Stage in workspace", status: "pending" }
    ]);

    try {
      setLiveThinking((s) => s.map((step, i) => ({ ...step, status: i === 0 ? "done" : i === 1 ? "active" : step.status })));
      const res = await workspaceFetch("/api/workspace/github/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remoteUrl: githubUrl.trim(),
          branch: githubBranch,
          repositoryId: repositoryId ?? undefined,
          mode: importMode
        })
      });
      setLiveThinking((s) => s.map((step, i) => ({ ...step, status: i <= 1 ? "done" : i === 2 ? "active" : step.status })));
      const data = (await res.json()) as {
        repositoryId?: string;
        files?: Array<{ path: string; content: string }>;
        imported?: string[];
        branch?: string;
        mode?: "key" | "full";
        truncated?: boolean;
        skipped?: string[];
        canonicalStore?: { written: number; unchanged: number; totalFiles: number };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setFilesInput(JSON.stringify(data.files ?? [], null, 2));
      if (data.branch) setGithubBranch(data.branch);
      setRepositoryId(data.repositoryId ?? repositoryId ?? `repo_${Date.now()}`);
      if (!brief.productName.trim()) {
        const repoName = githubUrl.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ?? "Imported project";
        setBrief((b) => ({ ...b, productName: repoName, primaryWorkflow: b.primaryWorkflow || "Ship core user workflow" }));
      }
      setActiveStep("plan");
      setContextTab("files");
      const count = data.imported?.length ?? 0;
      const modeLabel = data.mode === "full" ? "full repo" : "key files";
      const sample = (data.imported ?? []).slice(0, 12).map((p) => `• ${p}`).join("\n");
      const more = count > 12 ? `\n• …and ${count - 12} more` : "";
      const skipNote =
        (data.skipped?.length ?? 0) > 0
          ? `\n\n_Skipped ${data.skipped!.length} path(s) (binaries, node_modules, or very large files)._`
          : "";
      const storeNote = data.canonicalStore
        ? `\n\n_Canonical store: ${data.canonicalStore.totalFiles} files on disk (${data.canonicalStore.written} updated, ${data.canonicalStore.unchanged} unchanged)._`
        : "";
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Imported ${count} file(s) (${modeLabel}) from branch ${data.branch ?? githubBranch}.\n\n${sample}${more}${skipNote}${storeNote}\n\nOpen Files to browse the tree. Describe a real change before Fix and report.`,
          phase: "building",
          thinkingSteps: [
            { id: "gh1", label: "Connect GitHub", status: "done" },
            { id: "gh2", label: data.mode === "full" ? "Import full repo" : "Import key files", status: "done", detail: data.branch }
          ],
          suggestedActions: ["Run sandbox verify", "Run Fix and report"]
        }
      ]);
      setLiveThinking((s) => s.map((step) => ({ ...step, status: "done" as const })));
      setSandboxPassed(false);
      setExportDone(false);
      await analyzeWorkspace(data.files ?? []);
      void recordLedger(
        "import",
        "Repository imported",
        `BootRise imported ${data.files?.length ?? 0} files from GitHub into architectural memory. You can now map symbols, propose fixes with approval gates, and verify before release.`
      );
      setStatus("Ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import failed");
      setStatus("Blocked");
      setLiveThinking([]);
    } finally {
      setBusy(false);
      setActivityDetail(null);
    }
  }

  async function approvePlan() {
    const id = pendingFixId ?? report?.pendingFixId;
    if (!id) {
      setError("No pending plan to approve.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus("Applying approved patches");
    try {
      const res = await workspaceFetch("/api/workspace/fix/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingFixId: id, sandboxPassed })
      });
      const data = (await res.json()) as {
        files?: Array<{ path: string; content: string }>;
        report?: WorkspaceFixReport;
        previewUrl?: string;
        previewSessionId?: string;
        devPreviewStatus?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Approval failed.");
      if (data.files) setFilesInput(JSON.stringify(data.files, null, 2));
      if (data.report) setReport(refreshSafeToPr(data.report, sandboxPassed));
      if (data.previewUrl) setPreviewUrl(data.previewUrl);
      setPreviewSessionId(data.previewSessionId ?? data.report?.previewSessionId ?? null);
      setDevPreviewStatus(data.devPreviewStatus ?? data.report?.devPreviewStatus ?? null);
      setPreviewFramework(data.report?.plan ? "Applied" : null);
      setActiveStep("verify");
      setContextTab("verify");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Approved and applied ${data.report?.patches?.length ?? 0} patch(es) to your workspace. Open **Verify** for web preview, then run sandbox.`,
          phase: "building",
          suggestedActions: ["Run sandbox verify", "Push to GitHub"]
        }
      ]);
      setStatus("Patches applied");
      void recordLedger(
        "fix_approved",
        "Plan approved",
        `BootRise applied ${data.report?.patches?.length ?? 0} approved patch(es). Open Verify for dev preview and sandbox build proof before pushing to GitHub.`
      );
      void recordLedger("preview", "Preview session", "Web preview and dev server started for post-approval verification.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Approval failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function rejectPlan() {
    const id = pendingFixId ?? report?.pendingFixId;
    if (!id) return;
    setBusy(true);
    try {
      const res = await workspaceFetch("/api/workspace/fix/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingFixId: id })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Reject failed.");
      setReport((r) =>
        r
          ? refreshSafeToPr(
              { ...r, approvalStatus: "rejected", planReviewStatus: "rejected" },
              sandboxPassed
            )
          : r
      );
      setPendingFixId(null);
      setStatus("Plan rejected");
      void recordLedger("fix_rejected", "Plan rejected", "No files were modified. Refine your fix request and run the pipeline again with a clearer file-specific description.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reject failed.");
    } finally {
      setBusy(false);
    }
  }

  async function pushToGithub() {
    if (!githubUrl.trim()) {
      setError("Enter a GitHub URL in Connect first.");
      return;
    }
    if (!report?.approvalStatus || report.approvalStatus !== "approved") {
      setError("Approve a plan before pushing to GitHub.");
      return;
    }
    const fixId = pendingFixId ?? report?.pendingFixId;
    if (!fixId) {
      setError("No approved pending fix — run Fix and approve before opening a draft PR.");
      return;
    }
    setBusy(true);
    setStatus("Opening draft PR");
    try {
      const res = await workspaceFetch("/api/workspace/github/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingFixId: fixId,
          remoteUrl: githubUrl.trim(),
          branch: githubBranch,
          projectId: projectId ?? repositoryId ?? undefined
        })
      });
      const data = (await res.json()) as {
        branch?: string;
        compareUrl?: string;
        pullRequestHint?: string;
        pushed?: string[];
        draftPr?: { prUrl: string; prNumber: number };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Push failed.");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: [
            `Pushed ${data.pushed?.length ?? 0} file(s) to branch \`${data.branch}\`.`,
            data.draftPr
              ? `Draft PR #${data.draftPr.prNumber}: ${data.draftPr.prUrl}`
              : data.compareUrl
                ? `Compare: ${data.compareUrl}`
                : "",
            data.pullRequestHint ?? ""
          ]
            .filter(Boolean)
            .join("\n\n")
        }
      ]);
      setStatus("Ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "GitHub push failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function runSandboxVerify() {
    if (parsedFiles.length === 0) {
      setError("Import or add files before running sandbox verify.");
      setContextTab("connect");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus("Sandbox verify");
    try {
      const files = parsedFiles;
      const res = await workspaceFetch("/api/workspace/sandbox/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, repositoryId: repositoryId ?? undefined })
      });
      const data = (await res.json()) as {
        status?: string;
        commands?: Array<{ label: string; exitCode: number; output: string }>;
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Sandbox failed");
      const passed = data.status === "passed";
      setSandboxPassed(passed);
      void recordLedger(
        "sandbox",
        "Sandbox verify",
        `BootRise finished sandbox verification with status "${data.status ?? "unknown"}". This build proof feeds Safe to PR and your Living Ledger timeline.`
      );
      if (report?.approvalStatus === "approved") {
        setReport((r) => (r ? refreshSafeToPr(r, passed) : r));
      } else if (report?.pendingFixId && passed) {
        setError("Approve the plan first — sandbox proof applies to applied patches.");
      }
      const log = (data.commands ?? []).map((c) => `## ${c.label} (exit ${c.exitCode})\n${c.output}`).join("\n\n");
      setSandboxLog(log);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.message ?? "Sandbox finished.",
          phase: "review",
          thinkingSteps: [
            { id: "sb1", label: "Stage files in sandbox", status: "done" },
            { id: "sb2", label: "Run verify commands", status: "done", detail: data.status }
          ]
        }
      ]);
      setStatus("Ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sandbox failed");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  function handleChatAction(action: string) {
    if (busy) return;
    const lower = action.toLowerCase();
    if (lower.includes("import") || lower.includes("re-import") || lower.includes("connect repo")) {
      void importFromGithub();
      return;
    }
    if (lower.includes("fix and report") || lower.includes("run fix")) {
      setContextTab("fix");
      setActiveStep("fix");
      void runFixReport(fixRequest);
      return;
    }
    if (lower.includes("specific change") || lower.includes("open fix")) {
      setContextTab("fix");
      setActiveStep("fix");
      return;
    }
    if (lower.includes("sandbox") || lower.includes("verify")) {
      setContextTab("verify");
      setActiveStep("verify");
      void runSandboxVerify();
      return;
    }
    if (lower.includes("export") || lower.includes("download") || lower.includes("bundle")) {
      setContextTab("export");
      setActiveStep("export");
      void exportBundle("download");
      return;
    }
    if (lower.includes("files") || lower.includes("browse")) {
      setContextTab("files");
      return;
    }
    if (lower.includes("paste")) {
      setContextTab("files");
      return;
    }
    void sendChat(action);
  }

  function goToStep(step: WorkspaceStep) {
    setActiveStep(step);
    const tab: Record<WorkspaceStep, string> = {
      connect: "connect",
      plan: "files",
      fix: "fix",
      verify: "verify",
      export: "export"
    };
    setContextTab(tab[step]);
  }

  async function handleFileUpload(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(null);
    setStatus("Reading files");
    try {
      const entries: Array<{ path: string; content: string }> = [];
      for (const file of Array.from(fileList)) {
        const relativePath = file.webkitRelativePath || file.name;
        const content = await file.text();
        entries.push({ path: relativePath.replace(/\\/g, "/"), content });
      }
      setFilesInput(JSON.stringify(entries, null, 2));
      await analyzeWorkspace(entries);
      setStatus("Ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
      setStatus("Blocked");
    }
  }

  function formatFixReportMessage(fixReport: WorkspaceFixReport): string {
    const previewOnly = fixReport.fixed.some((f) => f.path.startsWith("generated/"));
    const pending = fixReport.approvalStatus === "pending_approval";
    const parts = [
      previewOnly
        ? "Fix report (generated preview paths only — refine your request):"
        : pending
          ? "Fix report (patches proposed — approve to apply to your workspace):"
          : "Fix report:",
      fixReport.plan.intent.interpretedGoal,
      `Risk: ${fixReport.plan.risk.level}`,
      "",
      previewOnly ? "Generated preview files:" : "Fixed:",
      ...fixReport.fixed.map((f) => `- ${f.path}: ${f.summary}`),
      "",
      "May break:",
      ...(fixReport.potentiallyBroken.length
        ? fixReport.potentiallyBroken.map((b) => `- ${b}`)
        : ["- None flagged"]),
      "",
      "How:",
      ...fixReport.howFixed.map((h) => `- ${h}`),
      "",
      "Next:",
      ...fixReport.guidanceForBuilder.map((g) => `- ${g}`)
    ];
    if (fixReport.plainEnglishSummary) {
      parts.push("", "Summary:", fixReport.plainEnglishSummary);
    }
    if (fixReport.safeToPr) {
      parts.push("", `Safe to PR? ${fixReport.safeToPr.label}`, ...fixReport.safeToPr.reasons.map((r) => `- ${r}`));
    }
    return parts.join("\n");
  }

  async function animateFixPipeline() {
    const steps = FIX_PIPELINE_STEPS.map((s) => ({ ...s }));
    setLiveThinking(steps);
    for (let i = 0; i < steps.length; i++) {
      steps[i] = { ...steps[i], status: "active" };
      setLiveThinking([...steps]);
      if (i > 0) steps[i - 1] = { ...steps[i - 1], status: "done" };
      await new Promise((r) => setTimeout(r, 280));
    }

    steps[steps.length - 1] = { ...steps[steps.length - 1], status: "done" };
    setLiveThinking([...steps]);
  }

  async function runFixReport(requestOverride?: string) {
    if (parsedFiles.length === 0) {
      setError("Import or paste code before running Fix and report.");
      setContextTab("connect");
      return;
    }
    const request = (requestOverride ?? fixRequest).trim();
    if (!requestOverride && FIX_REQUEST_PLACEHOLDER.test(request)) {
      setError("Describe a specific change in Fix and report (e.g. add header X-App-Version in app/backend/main.py).");
      setContextTab("fix");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus("Fix pipeline");
    setActivityDetail("Planning → blast radius → diff preview");

    try {
      await animateFixPipeline();
      const files = parseFiles();
      const response = await workspaceFetch("/api/workspace/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, files, provider, mode: modelMode, projectId: projectId ?? repositoryId ?? undefined })
      });
      const data = (await response.json()) as {
        report: WorkspaceFixReport;
        repositoryId: string;
        pendingFixId?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Fix workflow failed.");

      setPendingFixId(data.pendingFixId ?? data.report.pendingFixId ?? null);
      setPreviewUrl(null);
      setPreviewSessionId(null);
      setDevPreviewStatus(null);
      setReport(refreshSafeToPr(data.report, false));
      setRepositoryId(data.repositoryId);
      setActiveStep("fix");
      setContextTab("fix");
      setStatus(data.report.approvalStatus === "pending_approval" ? "Awaiting approval" : "Report ready");
      void recordLedger(
        "fix_proposed",
        "Fix plan proposed",
        `BootRise proposed ${data.report.patches?.length ?? data.report.fixed.length} patch(es) on real paths. Your workspace files are unchanged until you approve — this controlled gate is how BootRise keeps AI-driven development safe and explainable.`
      );
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: formatFixReportMessage(data.report),
          thinkingSteps: FIX_PIPELINE_STEPS.map((s) => ({ ...s, status: "done" as const })),
          fileActivity: loadedFilePaths.map((path) => {
            const fixed = data.report.fixed.find((f) => f.path === path);
            return {
              path,
              status: fixed ? ("fixed" as const) : ("planned" as const),
              detail: fixed?.summary ?? "No direct edit"
            };
          })
        }
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Fix workflow failed.");
      setStatus("Blocked");
    } finally {
      setLiveThinking([]);
      setBusy(false);
      setActivityDetail(null);
    }
  }

  async function sendChat(message: string) {
    if (!message.trim() || busy) return;
    setBusy(true);
    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setStatus("Thinking");
    setActivityDetail(githubUrl ? `Repo: ${githubUrl.split("/").slice(-2).join("/")}` : null);

    const previewFiles = hasCode
      ? (() => {
          const snippets = parsedFiles.map((f) => ({ path: f.path, content: f.content.slice(0, 400) }));
          const config = { batchSize: 36, maxBatches: 8, singleMaxFiles: 64 };
          const plan = selectReviewBatches(message, snippets, config.batchSize, config.maxBatches);
          if (plan.batches.length > 1) {
            return plan.batches.flat().map((f) => f.path);
          }
          return selectRelevantFiles(message, snippets, config.singleMaxFiles).map((f) => f.path);
        })()
      : [];
    setLiveFilesInFocus(previewFiles);
    setLiveActiveFile(previewFiles[0] ?? null);

    setLiveThinking([
      { id: "t1", label: "Parse message", status: "active", detail: message.slice(0, 80) },
      {
        id: "t2",
        label: "Load file context",
        status: previewFiles.length > 0 ? "active" : "pending",
        detail: previewFiles.length > 0 ? `${previewFiles.length} file(s) queued` : "No files in workspace"
      },
      { id: "t3", label: "Plan response", status: "pending" },
      { id: "t4", label: "Publish reply", status: "pending" }
    ]);

    try {
      setLiveThinking((s) =>
        s.map((step) =>
          step.id === "t1"
            ? { ...step, status: "done" }
            : step.id === "t2"
              ? { ...step, status: "active" }
              : step
        )
      );
      const response = await workspaceFetch("/api/workspace/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: nextMessages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          projectBrief: briefReady ? brief : undefined,
          hasCode,
          loadedFilePaths,
          loadedFiles: parsedFiles.map((f) => ({
            path: f.path,
            content: f.content.length > 12_000 ? `${f.content.slice(0, 12_000)}\n…` : f.content
          })),
          lastReport: report,
          provider,
          mode: modelMode,
          persona,
          githubUrl: githubUrl || null,
          githubBranch,
          repositoryId: repositoryId ?? undefined,
          projectId: projectId ?? repositoryId ?? undefined
        })
      });
      const data = (await response.json()) as ChatApiResponse;
      if (!response.ok) throw new Error(data.error ?? "Chat failed.");
      if (data.chatControl) setLastChatControl(data.chatControl);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.reply ?? "No response.",
        phase: data.phase,
        thinkingSteps: data.thinkingSteps,
        fileActivity: data.fileActivity?.slice(0, 12),
        suggestedActions: data.suggestedActions,
        plainEnglishSummary: data.plainEnglishSummary
      };

      setLiveThinking((s) =>
        s.map((step) => ({
          ...step,
          status: "done" as const,
          detail:
            step.id === "t2" && data.thinkingSteps?.find((x) => x.id === "files")?.detail
              ? data.thinkingSteps.find((x) => x.id === "files")!.detail
              : step.detail
        }))
      );
      if (data.thinkingSteps?.length) {
        const paths = data.fileActivity?.map((f) => f.path) ?? previewFiles;
        setLiveFilesInFocus(paths);
      }
      setMessages([...nextMessages, assistantMessage]);
      setStatus("Ready");

      if (data.triggerFix && hasCode) {
        setFixRequest(message);
        await runFixReport(message);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chat failed.");
      setStatus("Blocked");
      setLiveThinking([]);
    } finally {
      setBusy(false);
      setActivityDetail(null);
      setLiveFilesInFocus([]);
      setLiveActiveFile(null);
      setLiveThinking([]);
    }
  }

  async function exportBundle(mode: "download" | "github") {
    if (parsedFiles.length === 0) {
      setError("Import files before exporting.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(mode === "download" ? "Preparing download" : "Preparing GitHub export");

    try {
      if (!briefReady) throw new Error("Complete the product brief (name + workflow) before exporting.");
      const files = parseFiles();
      const response = await workspaceFetch("/api/workspace/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          projectBrief: brief,
          files,
          plan: report?.plan,
          report: report ?? undefined,
          repositoryId: repositoryId ?? undefined,
          remoteUrl: mode === "github" ? githubUrl : undefined,
          branch: githubBranch,
          preferredProvider: provider,
          repoHealth,
          createDraftPr: mode === "github"
        })
      });
      const data = (await response.json()) as {
        downloadPayload?: string;
        downloadName?: string;
        pushSteps?: string[];
        draftPr?: { prUrl: string; prNumber: number };
        message?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Export failed.");

      if (mode === "download" && data.downloadPayload && data.downloadName) {
        const blob = new Blob([data.downloadPayload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = data.downloadName;
        anchor.click();
        URL.revokeObjectURL(url);
        setExportDone(true);
        setActiveStep("export");
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: `Downloaded ${data.downloadName}. Extract and push to GitHub or deploy from your machine.`
          }
        ]);
      }

      if (mode === "github") {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: data.draftPr
              ? `Draft PR opened: ${data.draftPr.prUrl}`
              : data.message ??
                (data.pushSteps
                  ? ["GitHub push steps:", ...(data.pushSteps ?? []).map((s, i) => `${i + 1}. ${s}`)].join("\n")
                  : "GitHub export completed.")
          }
        ]);
      }

      setStatus("Ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Export failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  const btnClass =
    "cursor-pointer transition disabled:cursor-not-allowed disabled:opacity-50";
  const primaryBtn = `${btnClass} rounded-lg bg-signal py-2.5 text-sm font-semibold text-white hover:opacity-90`;
  const secondaryBtn = `${btnClass} rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-graphite hover:bg-cloud`;

  return (
    <section className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
      <WorkspaceCommandCenter
        projectName={projectName}
        report={report}
        creditsRemaining={creditsRemaining}
        modelMode={provider === "openai" ? "Premium" : `BootRise ${modelMode}`}
        securityBlockers={securityBlockers}
        brainSummary={brainStats}
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <PersonaSelector value={persona} onChange={setPersona} />
        <div className="flex flex-wrap items-center gap-2">
          <EngineToggle
            provider={provider}
            onChange={setProvider}
            mode={modelMode}
            onModeChange={setModelMode}
            bootriseOk={providerHealth.bootrise}
            openaiOk={providerHealth.openai}
          />
          <StatusPill label={projectStorage === "supabase" ? "Cloud saved" : "Local"} tone="neutral" />
          <StatusPill label={status} tone={error ? "failed" : isWorking ? "neutral" : "neutral"} />
        </div>
      </div>

      <ProjectDashboard
        projectName={projectName}
        fileCount={loadedFilePaths.length}
        githubUrl={githubUrl}
        branch={githubBranch}
        health={repoHealth}
        sandboxPassed={sandboxPassed}
        safeToPr={report?.safeToPr ?? null}
        storage={projectStorage}
        lastSaved={lastProjectSaved}
      />

      <WorkspaceStepRail
        active={activeStep}
        onChange={(step) => {
          setActiveStep(step);
          const tab: Record<WorkspaceStep, string> = {
            connect: "connect",
            plan: "files",
            fix: "fix",
            verify: "verify",
            export: "export"
          };
          setContextTab(tab[step]);
        }}
        completed={stepCompleted}
      />

      {error ? (
        <div className="mt-4 rounded-lg border border-critical/25 bg-critical/10 px-4 py-3 text-sm text-critical">{error}</div>
      ) : null}
      {saveNotice ? (
        <div className="mt-4 rounded-lg border border-line bg-cloud px-4 py-2 text-xs text-graphite">{saveNotice}</div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[240px_minmax(0,1.2fr)_minmax(340px,0.9fr)]">
        <aside className="hidden flex-col gap-4 xl:flex">
          <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <WorkspaceQuickNav
              busy={busy}
              fileCount={loadedFilePaths.length}
              hasReport={Boolean(report)}
              onStep={goToStep}
              onImport={() => void importFromGithub()}
              onReviewIssues={() => void sendChat(REVIEW_ISSUES_PROMPT)}
              onFix={() => {
                goToStep("fix");
                if (!report) void runFixReport();
              }}
              onSandbox={() => void runSandboxVerify()}
              onExport={() => void exportBundle("download")}
            />
          </div>
        </aside>

        <div className="flex min-h-[calc(100vh-260px)] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          <div className="border-b border-line bg-cloud/40 px-4 py-3">
            <p className="text-sm font-semibold text-ink">Conversation</p>
            <p className="text-xs text-steel">Live file focus appears below while BootRise works</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <WorkspaceChatMessage
                key={`${message.role}-${index}`}
                role={message.role}
                content={message.content}
                phase={message.phase}
                thinkingSteps={message.thinkingSteps}
                fileActivity={message.fileActivity}
                suggestedActions={message.suggestedActions}
                plainEnglishSummary={message.plainEnglishSummary}
                onAction={handleChatAction}
              />
            ))}
          </div>

          <div className="border-t border-line bg-cloud/50 p-4">
            <AgentLiveBar
              busy={busy}
              status={status}
              steps={liveThinking}
              filesInFocus={liveFilesInFocus}
              activeFile={liveActiveFile}
              totalFiles={loadedFilePaths.length}
            />
            <div className="mb-2 mt-3 flex flex-wrap gap-2">
              {[
                { label: "What can you do?", msg: "What can you do?" },
                { label: "List project issues", msg: REVIEW_ISSUES_PROMPT },
                { label: "Review my repo", msg: `What is this repo about? ${githubUrl}` },
                { label: "Feature advice", msg: "Should I add payments now?" },
                { label: "Run sandbox", action: "sandbox" as const },
                { label: "Open Fix", action: "fix" as const }
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  disabled={busy}
                  className={`${secondaryBtn} rounded-full px-3 py-1 text-xs`}
                  onClick={() => {
                    if ("action" in q && q.action === "sandbox") {
                      void runSandboxVerify();
                      return;
                    }
                    if ("action" in q && q.action === "fix") {
                      goToStep("fix");
                      return;
                    }
                    if ("msg" in q) void sendChat(q.msg);
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
            {lastChatControl ? <ChatControlBanner control={lastChatControl} /> : null}
            <div className="flex gap-2">
              <textarea
                className="min-h-[44px] flex-1 resize-none rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink"
                placeholder="Ask BootRise… paste a GitHub URL, describe a fix, or plan your next milestone"
                rows={2}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (chatInput.trim()) {
                      void sendChat(chatInput.trim());
                      setChatInput("");
                    }
                  }
                }}
              />
              <button
                type="button"
                disabled={busy}
                className={`${primaryBtn} self-end px-5`}
                onClick={() => {
                  if (chatInput.trim()) {
                    void sendChat(chatInput.trim());
                    setChatInput("");
                  }
                }}
              >
                {busy ? "Working…" : "Send"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-[calc(100vh-220px)] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          <WorkspaceTabs
            active={contextTab}
            onChange={setContextTab}
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "connect", label: "Connect", badge: githubUrl ? "●" : undefined },
              { id: "files", label: "Files", badge: String(loadedFilePaths.length) },
              { id: "architecture", label: "Architecture" },
              { id: "brain", label: "Brain" },
              { id: "control", label: "Control" },
              { id: "security", label: "Security" },
              { id: "fix", label: "Fix", badge: report ? "✓" : undefined },
              { id: "verify", label: "Verify" },
              { id: "ledger", label: "Ledger" },
              { id: "export", label: "PR / Export", badge: exportDone ? "✓" : undefined }
            ]}
          />
          <div className="flex-1 overflow-y-auto">
            {contextTab === "connect" ? (
              <Panel title="GitHub repository">
                <input
                  className="w-full rounded-lg border border-line bg-cloud px-3 py-2 text-sm"
                  placeholder="https://github.com/org/repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
                <div className="mt-3 flex gap-2">
                  <select
                    className="flex-1 rounded-lg border border-line bg-cloud px-3 py-2 text-sm"
                    value={githubBranch}
                    onChange={(e) => setGithubBranch(e.target.value)}
                  >
                    {(githubBranches.length ? githubBranches : [githubBranch]).map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    className={secondaryBtn}
                    onClick={() => void loadGithubBranches()}
                  >
                    Branches
                  </button>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className={`${importMode === "full" ? primaryBtn : secondaryBtn} flex-1`}
                    onClick={() => setImportMode("full")}
                  >
                    Full repo
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={`${importMode === "key" ? primaryBtn : secondaryBtn} flex-1`}
                    onClick={() => setImportMode("key")}
                  >
                    Key files only
                  </button>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className={`${primaryBtn} mt-2 w-full`}
                  onClick={() => void importFromGithub()}
                >
                  {busy ? "Working…" : importMode === "full" ? "Import repo into workspace" : "Import key files"}
                </button>
                <p className="mt-3 text-xs leading-5 text-steel">
                  Full import loads all text source files from the repo (skips node_modules, images, and huge binaries).
                  Key import is 7 manifests for a fast skim. Add GITHUB_TOKEN in server .env for private repos.
                </p>
                <div className="mt-4 border-t border-line pt-4">
                  <p className="text-xs font-semibold text-ink">Project</p>
                  <input
                    className="mt-2 w-full rounded-lg border border-line bg-cloud px-3 py-2 text-sm"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    className={`${secondaryBtn} mt-2 w-full`}
                    onClick={() => void saveProject()}
                  >
                    Save to {projectStorage === "supabase" ? "Supabase" : "local disk"}
                  </button>
                  {projects.length > 0 ? (
                    <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto">
                      {projects.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            disabled={busy}
                            className="w-full cursor-pointer rounded px-2 py-1 text-left text-xs text-graphite hover:bg-cloud disabled:opacity-50"
                            onClick={() => void loadProject(p.id)}
                          >
                            {p.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </Panel>
            ) : null}

            {contextTab === "files" ? (
              <Panel
                title="Workspace files"
                action={
                  <button
                    type="button"
                    className="text-xs font-semibold text-signal"
                    onClick={() => setShowJsonEditor((v) => !v)}
                  >
                    {showJsonEditor ? "List view" : "JSON"}
                  </button>
                }
              >
                {!showJsonEditor ? (
                  <>
                    <p className="mb-2 text-xs text-steel">{parsedFiles.length} file(s) — select to preview</p>
                    <FileTreeExplorer
                      files={parsedFiles}
                      selectedPath={selectedFilePath ?? parsedFiles[0]?.path ?? null}
                      onSelect={setSelectedFilePath}
                      maxTreeHeight="min(40vh, 280px)"
                    />
                    {selectedFilePath ? (
                      <textarea
                        className="mt-3 min-h-[min(36vh,320px)] w-full resize-y rounded-lg border border-line bg-cloud p-2 font-mono text-[11px] leading-4"
                        value={parsedFiles.find((f) => f.path === selectedFilePath)?.content ?? ""}
                        onChange={(e) => updateFileContent(selectedFilePath, e.target.value)}
                      />
                    ) : null}
                    <input
                      type="file"
                      multiple
                      className="mt-3 w-full text-xs text-steel"
                      onChange={(e) => void handleFileUpload(e.target.files)}
                    />
                  </>
                ) : (
                  <textarea
                    className="min-h-48 w-full rounded-lg border border-line bg-cloud p-2 font-mono text-[11px]"
                    value={filesInput}
                    onChange={(e) => setFilesInput(e.target.value)}
                  />
                )}
                <div className="mt-4 border-t border-line pt-4">
                  <p className="text-xs font-semibold text-ink">Product brief (improves planning)</p>
                  <input
                    className="mt-2 w-full rounded-lg border border-line bg-cloud px-3 py-2 text-sm"
                    placeholder="Product name"
                    value={brief.productName}
                    onChange={(e) => setBrief({ ...brief, productName: e.target.value })}
                  />
                  <textarea
                    className="mt-2 min-h-14 w-full rounded-lg border border-line bg-cloud px-3 py-2 text-sm"
                    placeholder="Primary workflow"
                    value={brief.primaryWorkflow}
                    onChange={(e) => setBrief({ ...brief, primaryWorkflow: e.target.value })}
                  />
                </div>
              </Panel>
            ) : null}

            {contextTab === "overview" ? (
              <Panel title="Overview">
                <p className="text-sm text-graphite">
                  Use the command center above for at-a-glance status. Import a repo in Connect, run Fix for control
                  gates, verify in Verify, then open a server-trusted draft PR from Export.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {[
                    { tab: "connect", label: "Connect GitHub" },
                    { tab: "fix", label: "Run fix pipeline" },
                    { tab: "security", label: "Security scan" },
                    { tab: "export", label: "PR / Export" }
                  ].map((item) => (
                    <button
                      key={item.tab}
                      type="button"
                      className={secondaryBtn}
                      onClick={() => setContextTab(item.tab)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </Panel>
            ) : null}

            {contextTab === "architecture" ? (
              <Panel title="Architecture map & blast radius">
                <ArchitectureMapPanel
                  files={parsedFiles}
                  repositoryId={repositoryId}
                  blastRootSymbol={report?.plan.impact.files[0] ?? null}
                />
              </Panel>
            ) : null}

            {contextTab === "brain" ? <ProjectBrainPanel projectId={projectId} /> : null}

            {contextTab === "control" ? (
              <div className="space-y-4 p-4">
                <Panel title="Agent council">
                  <AgentCouncilPanel control={report?.controlLayer} />
                </Panel>
                {report?.controlLayer && !report.controlLayer.canApprove ? (
                  <BlockedStateCard
                    title={
                      report.controlLayer.contextGate.status === "needs_clarification"
                        ? "Blocked by Context Gate"
                        : "Patch blocked"
                    }
                    reason={report.controlLayer.stopReason ?? "Control layer blocked approval."}
                    needs={report.controlLayer.contextGate.questions.map((q) => q.question)}
                  />
                ) : null}
                <Panel title="Control layer">
                  {report?.controlLayer ? (
                    <ControlLayerPanel control={report.controlLayer} />
                  ) : (
                    <p className="text-sm text-steel">Run Fix to see Context Gate, Scope Contract, and Patch Guard results.</p>
                  )}
                </Panel>
              </div>
            ) : null}

            {contextTab === "security" ? (
              <Panel title="Security & deployment">
                <SecurityPanel
                  filesJson={filesInput}
                  projectId={projectId ?? undefined}
                  creditsRemaining={creditsRemaining}
                  onScanComplete={(critical) => setSecurityBlockers(critical)}
                />
              </Panel>
            ) : null}

            {contextTab === "ledger" ? (
              <Panel title="Living Ledger">
                <p className="mb-3 text-sm leading-6 text-graphite">
                  BootRise records each architectural state transition — import, proposed fix, approval, verification —
                  so you can trace what changed and why before shipping.
                </p>
                <WorkspaceLivingLedger projectId={projectId ?? (repositoryId ? `proj_${repositoryId}` : null)} />
              </Panel>
            ) : null}

            {contextTab === "fix" ? (
              <Panel title="Fix and report">
                <textarea
                  className="min-h-20 w-full rounded-lg border border-line bg-cloud px-3 py-2 text-sm"
                  placeholder="What should change? Be specific about files or behavior."
                  value={fixRequest}
                  onChange={(e) => setFixRequest(e.target.value)}
                />
                <button
                  type="button"
                  disabled={busy}
                  className={`${primaryBtn} mt-3 w-full bg-ink`}
                  onClick={() => void runFixReport()}
                >
                  Run fix pipeline
                </button>
                {report?.controlLayer ? <ControlLayerPanel control={report.controlLayer} /> : null}
                {report?.approvalStatus === "pending_approval" && report.patches?.length ? (
                  <PlanApprovalPanel
                    patches={report.patches}
                    patchSource={report.patchSource}
                    busy={busy}
                    canApprove={report.controlLayer?.canApprove !== false}
                    blockReason={report.controlLayer?.stopReason ?? undefined}
                    onApprove={() => void approvePlan()}
                    onReject={() => void rejectPlan()}
                  />
                ) : null}
                {report ? (
                  <div className="mt-4">
                    <DiffReportPanel report={report} />
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-steel">Import files first, then run the pipeline for plan, blast radius, and diff.</p>
                )}
              </Panel>
            ) : null}

            {contextTab === "verify" ? (
              <Panel title="Verify & preview">
                <WebContainerPreview
                  files={parsedFiles}
                  active={report?.approvalStatus === "approved"}
                  onRuntimeError={(message, likelyFiles) => {
                    const pid = projectId ?? (repositoryId ? `proj_${repositoryId}` : null);
                    if (!pid) return;
                    void workspaceFetch("/api/workspace/runtime/events", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ projectId: pid, message, likelyFiles })
                    });
                  }}
                />
                <DeviceStreamPanel
                  repositoryId={repositoryId}
                  hasExpo={loadedFilePaths.some((p) => p.startsWith("app/mobile/"))}
                  fileCount={loadedFilePaths.length}
                />
                <p className="my-3 text-xs font-semibold uppercase text-steel">Host / proxy fallback</p>
                <WebPreviewPanel
                  previewUrl={previewUrl ?? report?.previewUrl ?? null}
                  previewSessionId={previewSessionId ?? report?.previewSessionId ?? null}
                  devPreviewStatus={devPreviewStatus ?? report?.devPreviewStatus ?? null}
                  framework={previewFramework ?? undefined}
                  changedFiles={report?.patches?.map((p) => p.path)}
                />
                <p className="mt-4 text-xs font-semibold uppercase text-steel">Runtime monitor</p>
                <RuntimeMonitorPanel projectId={projectId} />
                <p className="mt-4 text-sm leading-6 text-graphite">
                  Sandbox checks structure and can run npm scripts when a full import includes lockfiles.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  className={`${secondaryBtn} mt-3 w-full`}
                  onClick={() => {
                    setActiveStep("verify");
                    setContextTab("verify");
                    void runSandboxVerify();
                  }}
                >
                  Run sandbox verify
                </button>
                {sandboxLog ? (
                  <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-ink p-3 text-[11px] leading-4 text-white">{sandboxLog}</pre>
                ) : null}
              </Panel>
            ) : null}

            {contextTab === "export" ? (
              <Panel title="Export">
                <p className="text-sm text-graphite">
                  Bundle includes brief, {loadedFilePaths.length} files, architecture health
                  {report ? ", fix report + summary" : ""}, and GitHub metadata.
                </p>
                {!briefReady ? (
                  <p className="mt-2 text-xs text-amber-800">Fill product name and workflow in Files before exporting.</p>
                ) : null}
                {report?.approvalStatus === "approved" ? (
                  <button
                    type="button"
                    disabled={busy}
                    className={`${primaryBtn} mb-2 w-full`}
                    onClick={() => void pushToGithub()}
                  >
                    Push approved patches to GitHub
                  </button>
                ) : (
                  <p className="mb-2 text-xs text-steel">Approve a plan before automated GitHub push (requires GITHUB_TOKEN).</p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  className={`${secondaryBtn} w-full`}
                  onClick={() => void exportBundle("download")}
                >
                  Download BootRise bundle
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={`${primaryBtn} mt-2 w-full bg-ink`}
                  onClick={() => void exportBundle("github")}
                >
                  Open draft PR on GitHub
                </button>
              </Panel>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
