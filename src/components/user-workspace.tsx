"use client";

import { useEffect, useMemo, useState } from "react";
import { DiffReportPanel } from "@/components/diff-report-panel";
import { WorkspaceChatMessage } from "@/components/workspace-chat-message";
import {
  ActivityConsole,
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

const WELCOME: ChatMessage = {
  role: "assistant",
  content: [
    "I am your BootRise builder agent. I can:",
    "- Answer what I do and guide discovery for long builds",
    "- Analyze pasted code and run Fix and report (plan, blast radius, diff, verification)",
    "- Connect GitHub (branch + import) or paste a repo link to review real metadata",
    "- Advise on features (helpful vs risky for your users)",
    "- Export a bundle or prepare GitHub push steps",
    "",
    "",
    "Start: open **Connect** → import your GitHub repo, then chat here to plan and fix."
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
  const [busy, setBusy] = useState(false);

  const parsedFiles = useMemo(() => {
    try {
      return JSON.parse(filesInput) as Array<{ path: string; content: string }>;
    } catch {
      return [];
    }
  }, [filesInput]);

  const isWorking = /Thinking|Fix pipeline|Importing|Sandbox|Saving|Loading/.test(status);

  useEffect(() => {
    void (async () => {
      try {
        const [projectsRes, healthRes] = await Promise.all([
          fetch("/api/workspace/projects"),
          fetch("/api/ai/providers/health")
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
      } catch {
        /* non-blocking */
      }
    })();
  }, []);

  const loadedFilePaths = useMemo(() => parsedFiles.map((f) => f.path).filter(Boolean), [parsedFiles]);
  const hasCode = loadedFilePaths.length > 0;
  const briefReady = brief.productName.trim().length > 0 && brief.primaryWorkflow.trim().length > 0;

  const stepCompleted: Partial<Record<WorkspaceStep, boolean>> = {
    connect: loadedFilePaths.length > 0,
    plan: briefReady || messages.length > 2,
    fix: Boolean(report),
    verify: Boolean(sandboxLog),
    export: false
  };

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
      const response = await fetch("/api/workspace/projects", {
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
      const response = await fetch(`/api/workspace/projects?id=${encodeURIComponent(id)}`);
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
      const res = await fetch(`/api/workspace/github/branches?url=${encodeURIComponent(githubUrl.trim())}`);
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
      const res = await fetch("/api/workspace/github/import", {
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
        files?: Array<{ path: string; content: string }>;
        imported?: string[];
        branch?: string;
        mode?: "key" | "full";
        truncated?: boolean;
        skipped?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setFilesInput(JSON.stringify(data.files ?? [], null, 2));
      if (data.branch) setGithubBranch(data.branch);
      setRepositoryId((id) => id ?? `repo_${Date.now()}`);
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
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Imported **${count}** file(s) (${modeLabel}) from \`${data.branch}\`.\n\n${sample}${more}${skipNote}\n\nOpen **Files** to browse the tree. Describe a real change before **Fix and report**.`,
          phase: "building",
          thinkingSteps: [
            { id: "gh1", label: "Connect GitHub", status: "done" },
            { id: "gh2", label: data.mode === "full" ? "Import full repo" : "Import key files", status: "done", detail: data.branch }
          ],
          suggestedActions: ["Run sandbox verify", "Run Fix and report"]
        }
      ]);
      setLiveThinking((s) => s.map((step) => ({ ...step, status: "done" as const })));
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
      const res = await fetch("/api/workspace/sandbox/verify", {
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
    if (lower.includes("import") || lower.includes("connect repo")) {
      void importFromGithub();
      return;
    }
    if (lower.includes("fix")) {
      void runFixReport(fixRequest);
      return;
    }
    if (lower.includes("sandbox")) {
      void runSandboxVerify();
      return;
    }
    if (lower.includes("export") || lower.includes("download")) {
      void exportBundle("download");
      return;
    }
    if (lower.includes("paste")) {
      setContextTab("files");
      return;
    }
    void sendChat(action);
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
      setStatus("Ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
      setStatus("Blocked");
    }
  }

  function formatFixReportMessage(fixReport: WorkspaceFixReport): string {
    const previewOnly = fixReport.fixed.some((f) => f.path.startsWith("generated/"));
    const parts = [
      previewOnly
        ? "Fix report (preview scaffold — your imported repo files were not edited):"
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
      parts.push("", "In plain English:", fixReport.plainEnglishSummary);
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
      const response = await fetch("/api/workspace/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, files, provider })
      });
      const data = (await response.json()) as {
        report: WorkspaceFixReport;
        repositoryId: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Fix workflow failed.");

      setReport(data.report);
      setRepositoryId(data.repositoryId);
      setActiveStep("fix");
      setContextTab("fix");
      setStatus("Report ready");
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
    setLiveThinking([
      { id: "t1", label: "Parse message", status: "active" },
      { id: "t2", label: "Load file context", status: "pending" },
      { id: "t3", label: "Plan response", status: "pending" },
      { id: "t4", label: "Publish reply", status: "pending" }
    ]);

    try {
      const response = await fetch("/api/workspace/chat", {
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
          githubUrl: githubUrl || null,
          githubBranch
        })
      });
      const data = (await response.json()) as ChatApiResponse;
      if (!response.ok) throw new Error(data.error ?? "Chat failed.");

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.reply ?? "No response.",
        phase: data.phase,
        thinkingSteps: data.thinkingSteps,
        fileActivity: data.fileActivity?.slice(0, 12),
        suggestedActions: data.suggestedActions,
        plainEnglishSummary: data.plainEnglishSummary
      };

      setLiveThinking((s) => s.map((step, i) => ({ ...step, status: i < 3 ? "done" : "active" })));
      setMessages([...nextMessages, assistantMessage]);
      setLiveThinking((s) => s.map((step) => ({ ...step, status: "done" as const })));
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
      const response = await fetch("/api/workspace/export", {
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
          preferredProvider: provider
        })
      });
      const data = (await response.json()) as {
        downloadPayload?: string;
        downloadName?: string;
        pushSteps?: string[];
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
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: `Downloaded ${data.downloadName}. Extract and push to GitHub or deploy from your machine.`
          }
        ]);
      }

      if (mode === "github" && data.pushSteps) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: ["GitHub push steps:", ...(data.pushSteps ?? []).map((s, i) => `${i + 1}. ${s}`)].join("\n")
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
    <section className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <EngineToggle
          provider={provider}
          onChange={setProvider}
          bootriseOk={providerHealth.bootrise}
          openaiOk={providerHealth.openai}
        />
        <div className="flex items-center gap-2">
          <StatusPill label={projectStorage === "supabase" ? "Cloud saved" : "Local"} tone="neutral" />
          <StatusPill label={status} tone={error ? "failed" : isWorking ? "neutral" : "neutral"} />
        </div>
      </div>

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

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="flex min-h-[calc(100vh-220px)] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          {liveThinking.length > 0 || busy ? (
            <ActivityConsole label={status} steps={liveThinking} detail={activityDetail ?? undefined} />
          ) : null}

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
            <div className="mb-2 flex flex-wrap gap-2">
              {[
                { label: "What can you do?", msg: "What can you do?" },
                { label: "Review my repo", msg: `What is this repo about? ${githubUrl}` },
                { label: "Feature advice", msg: "Should I add payments now?" }
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  disabled={busy}
                  className={`${secondaryBtn} rounded-full px-3 py-1 text-xs`}
                  onClick={() => void sendChat(q.msg)}
                >
                  {q.label}
                </button>
              ))}
            </div>
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
              { id: "connect", label: "Connect", badge: githubUrl ? "●" : undefined },
              { id: "files", label: "Files", badge: String(loadedFilePaths.length) },
              { id: "fix", label: "Fix", badge: report ? "✓" : undefined },
              { id: "verify", label: "Verify" },
              { id: "export", label: "Export" }
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
              <Panel title="Sandbox verify">
                <p className="text-sm leading-6 text-graphite">
                  Checks JSON validity and Python syntax on imported files. Full npm install needs a complete repo clone — partial
                  imports skip heavy installs.
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
                  GitHub push instructions
                </button>
              </Panel>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
