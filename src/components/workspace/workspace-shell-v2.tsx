"use client";

import { useEffect, useMemo, useState } from "react";
import { BlockerRow } from "@/components/ui/blocker-row";
import { CommandButton } from "@/components/ui/command-button";
import { OperationPanelV2 } from "@/components/workspace/operation-panel-v2";
import { RepoFileExplorer, type FileNode } from "@/components/workspace/repo-file-explorer";
import { WorkspaceCommandStrip } from "@/components/workspace/workspace-command-strip";
import { WorkspaceDiffViewer, type DiffFile } from "@/components/workspace/workspace-diff-viewer";
import { WorkspaceTopbarV2 } from "@/components/workspace/workspace-topbar-v2";
import { WorkflowRailV2, type WorkspaceV2Step } from "@/components/workspace/workflow-rail-v2";
import type { WorkspaceProvider, WorkspaceRole, WorkspaceSpeed } from "@/components/workspace/mode-popover";
import type { ProjectBrief, WorkspaceFixReport } from "@/lib/workspace/workspace-types";

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
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
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

  useEffect(() => {
    void refreshPlatform();
  }, []);

  const repoConnected = files.length > 0;
  const fileTree = useMemo(() => buildTree(files, report?.patches?.map((patch) => patch.path) ?? []), [files, report]);
  const selectedFile = files.find((file) => file.path === selectedPath);
  const diff = useMemo(() => reportToDiff(report), [report]);
  const providerConfigured = providerHealth.find((item) => item.provider === provider)?.connected ?? true;
  const briefReady = Boolean(brief.productName.trim() && brief.primaryWorkflow.trim());
  const controlBlocked = Boolean(report?.controlLayer && !report.controlLayer.canApprove);
  const safeToPr = report?.safeToPr?.status === "yes" || report?.approvalStatus === "approved";

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
      setFiles(nextFiles);
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
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Import failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function runFix() {
    if (!repoConnected) return setIssue("Connect a repo before running Fix.");
    if (!fixRequest.trim()) return setIssue("Describe one scoped change before running Fix.");
    setBusy(true);
    setStatus("Running Fix");
    try {
      const res = await fetch("/api/workspace/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request: fixRequest,
          files,
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
      setRepositoryId(data.repositoryId ?? data.report.repositoryId ?? repositoryId);
      setActiveStep("verify");
      setIssue(null);
      setStatus("Fix report ready");
    } catch (caught) {
      setIssue(caught instanceof Error ? caught.message : "Fix failed.");
      setStatus("Blocked");
    } finally {
      setBusy(false);
    }
  }

  async function runVerify() {
    if (!repoConnected) return setIssue("Connect a repo before running Verify.");
    setBusy(true);
    setStatus("Sandbox verify");
    try {
      const res = await fetch("/api/workspace/sandbox/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, repositoryId: repositoryId ?? undefined })
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
        body: JSON.stringify({ mode: "download", projectBrief: brief, files, plan: report?.plan, report: report ?? undefined, repositoryId: repositoryId ?? undefined, preferredProvider: provider })
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
    else if (activeStep === "fix") void runFix();
    else if (activeStep === "verify") void runVerify();
    else void exportBundle();
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
        securityBlockers={0}
        safeToPr={safeToPr}
        deployStatus={sandboxLog ? "ready" : "unknown"}
        busy={busy}
        role={role}
        provider={provider}
        speed={speed}
        onRoleChange={setRole}
        onProviderChange={setProvider}
        onSpeedChange={setSpeed}
        onPrimaryAction={primaryAction}
      />
      <div className="grid min-h-[calc(100vh-244px)] flex-1 grid-cols-[220px_minmax(0,1fr)_320px]">
        <WorkflowRailV2 activeStep={activeStep} repoConnected={repoConnected} onStepChange={(step) => (!repoConnected && step !== "connect" ? undefined : setActiveStep(step))} />
        <main className="min-w-0 bg-surface-ws">
          {repoConnected ? (
            <div className="grid h-full min-h-[520px] grid-cols-[260px_minmax(0,1fr)]">
              <RepoFileExplorer files={fileTree} selectedPath={selectedPath} onSelect={setSelectedPath} />
              <div className="min-w-0 overflow-y-auto">
                {diff.length > 0 && activeStep !== "brief" ? (
                  <WorkspaceDiffViewer diff={diff} />
                ) : selectedFile ? (
                  <pre className="min-h-full overflow-auto p-5 font-mono text-xs leading-5 text-text-ws-2">{selectedFile.content}</pre>
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
          onGithubUrlChange={setGithubUrl}
          onGithubBranchChange={setGithubBranch}
          onImportModeChange={setImportMode}
          onProjectNameChange={setProjectName}
          onBriefChange={setBrief}
          onFixRequestChange={setFixRequest}
          onLoadBranches={loadBranches}
          onOpenDocs={() => window.open("/docs/GITHUB_APP.md", "_blank", "noreferrer")}
        />
      </div>
    </div>
  );
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
