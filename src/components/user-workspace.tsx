"use client";

import { useMemo, useState } from "react";
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
  thinkingSteps?: ThinkingStep[];
  fileActivity?: FileActivity[];
}

interface ChatApiResponse {
  reply?: string;
  thinkingSteps?: ThinkingStep[];
  fileActivity?: FileActivity[];
  triggerFix?: boolean;
  error?: string;
}

const SAMPLE_FILES = JSON.stringify(
  [
    {
      path: "src/lib/auth/session.ts",
      content:
        "export function getSession() { return null; }\nexport function requireSession() { throw new Error('missing'); }"
    },
    {
      path: "src/app/api/profile/route.ts",
      content:
        "import { getSession } from '@/lib/auth/session';\nexport async function GET() { const s = getSession(); return Response.json({ ok: !!s }); }"
    }
  ],
  null,
  2
);

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
    "- Review public GitHub repos when you paste a link and ask for a review",
    "- Advise on features (helpful vs risky for your users)",
    "- Export a bundle or prepare GitHub push steps",
    "",
    "Paste code on the right, then ask a question or click Fix and report."
  ].join("\n")
};

export function UserWorkspace() {
  const [brief, setBrief] = useState<ProjectBrief>(DEFAULT_BRIEF);
  const [filesInput, setFilesInput] = useState(SAMPLE_FILES);
  const [fixRequest, setFixRequest] = useState(
    "Fix session handling so profile API does not throw when unauthenticated"
  );
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [chatInput, setChatInput] = useState("");
  const [report, setReport] = useState<WorkspaceFixReport | null>(null);
  const [repositoryId, setRepositoryId] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [useOpenAI, setUseOpenAI] = useState(true);
  const [liveThinking, setLiveThinking] = useState<ThinkingStep[]>([]);
  const [liveFileActivity, setLiveFileActivity] = useState<FileActivity[]>([]);

  const loadedFilePaths = useMemo(() => {
    try {
      const parsed = JSON.parse(filesInput) as Array<{ path: string }>;
      return Array.isArray(parsed) ? parsed.map((f) => f.path).filter(Boolean) : [];
    } catch {
      return [];
    }
  }, [filesInput]);

  const hasCode = loadedFilePaths.length > 0;
  const briefReady = brief.productName.trim().length > 0 && brief.primaryWorkflow.trim().length > 0;

  function parseFiles() {
    return JSON.parse(filesInput) as Array<{ path: string; content: string }>;
  }

  function formatFixReportMessage(fixReport: WorkspaceFixReport): string {
    return [
      `Fix report: ${fixReport.plan.intent.interpretedGoal}`,
      `Risk: ${fixReport.plan.risk.level}`,
      "",
      "Fixed:",
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
    ].join("\n");
  }

  async function animateFixPipeline() {
    const steps = FIX_PIPELINE_STEPS.map((s) => ({ ...s }));
    setLiveThinking(steps);
    setLiveFileActivity(
      loadedFilePaths.map((path) => ({ path, status: "queued" as const, detail: "Waiting for pipeline" }))
    );

    for (let i = 0; i < steps.length; i++) {
      steps[i] = { ...steps[i], status: "active" };
      setLiveThinking([...steps]);
      if (i > 0) steps[i - 1] = { ...steps[i - 1], status: "done" };
      if (i >= 1 && i <= 3) {
        setLiveFileActivity(
          loadedFilePaths.map((path) => ({
            path,
            status: i === 3 ? "at-risk" : "analyzing",
            detail: i === 3 ? "Blast radius trace" : "Symbol graph"
          }))
        );
      }
      await new Promise((r) => setTimeout(r, 280));
    }

    steps[steps.length - 1] = { ...steps[steps.length - 1], status: "done" };
    setLiveThinking([...steps]);
  }

  async function runFixReport(requestOverride?: string) {
    setError(null);
    setStatus("Fix pipeline");
    const request = requestOverride ?? fixRequest;

    try {
      await animateFixPipeline();
      const files = parseFiles();
      const response = await fetch("/api/workspace/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, files })
      });
      const data = (await response.json()) as {
        report: WorkspaceFixReport;
        repositoryId: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Fix workflow failed.");

      setReport(data.report);
      setRepositoryId(data.repositoryId);
      setLiveFileActivity(
        loadedFilePaths.map((path) => {
          const fixed = data.report.fixed.find((f) => f.path === path);
          const atRisk = data.report.potentiallyBroken.some((b) => b.includes(path));
          return {
            path,
            status: fixed ? "fixed" : atRisk ? "at-risk" : "planned",
            detail: fixed?.summary ?? (atRisk ? "Dependent area" : "Reviewed")
          };
        })
      );
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
    }
  }

  async function sendChat(message: string) {
    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setStatus("Thinking");
    setLiveThinking([
      { id: "t1", label: "Parse message", status: "active" },
      { id: "t2", label: "Load file context", status: "pending" },
      { id: "t3", label: "Respond", status: "pending" }
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
          lastReport: report,
          useOpenAI
        })
      });
      const data = (await response.json()) as ChatApiResponse;
      if (!response.ok) throw new Error(data.error ?? "Chat failed.");

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.reply ?? "No response.",
        thinkingSteps: data.thinkingSteps,
        fileActivity: data.fileActivity
      };

      setMessages([...nextMessages, assistantMessage]);
      setLiveThinking([]);
      setLiveFileActivity(data.fileActivity ?? []);
      setStatus("Ready");

      if (data.triggerFix && hasCode) {
        setFixRequest(message);
        await runFixReport(message);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chat failed.");
      setStatus("Blocked");
      setLiveThinking([]);
    }
  }

  async function exportBundle(mode: "download" | "github") {
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
          remoteUrl: mode === "github" ? githubUrl : undefined
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
    }
  }

  const showLivePanel = liveThinking.length > 0 || liveFileActivity.length > 0;

  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-steel">Builder workspace</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Plan, fix, verify, export</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-steel">
            <input type="checkbox" checked={useOpenAI} onChange={(e) => setUseOpenAI(e.target.checked)} />
            Use OpenAI when configured
          </label>
          <StatusPill label={status} tone={error ? "failed" : "neutral"} />
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded border border-critical/25 bg-critical/10 p-3 text-sm text-critical">{error}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-h-[640px] flex-col rounded border border-line bg-white">
          {showLivePanel ? (
            <div className="border-b border-line bg-cloud p-3">
              <p className="text-xs font-semibold uppercase text-steel">Working</p>
              <ThinkingPanel steps={liveThinking} />
              {liveFileActivity.length > 0 ? <FileActivityPanel items={liveFileActivity} compact /> : null}
            </div>
          ) : null}

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded p-3 text-sm leading-6 ${
                  message.role === "user" ? "bg-cloud text-ink" : "border border-line bg-white text-graphite"
                }`}
              >
                <p className="mb-1 text-xs font-semibold uppercase text-steel">{message.role}</p>
                {message.thinkingSteps && message.thinkingSteps.length > 0 ? (
                  <ThinkingPanel steps={message.thinkingSteps} />
                ) : null}
                {message.fileActivity && message.fileActivity.length > 0 ? (
                  <FileActivityPanel items={message.fileActivity} compact />
                ) : null}
                <pre className="mt-2 whitespace-pre-wrap font-sans">{message.content}</pre>
              </div>
            ))}
          </div>

          <div className="border-t border-line p-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-graphite"
                onClick={() => sendChat("What can you do?")}
              >
                What can you do?
              </button>
              <button
                type="button"
                className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-graphite"
                onClick={() => sendChat("Should I add payments now?")}
              >
                Feature advice
              </button>
              <button
                type="button"
                className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-graphite"
                onClick={() => sendChat("How do I export a download bundle?")}
              >
                Export help
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded border border-line bg-cloud px-3 py-2 text-sm text-ink"
                placeholder="Ask BootRise about your build, fixes, or paste a GitHub URL to review..."
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
                className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white"
                onClick={() => {
                  if (chatInput.trim()) {
                    void sendChat(chatInput.trim());
                    setChatInput("");
                  }
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded border border-line bg-white p-4">
            <p className="text-sm font-semibold text-ink">Product brief</p>
            <div className="mt-3 space-y-2">
              <input
                className="w-full rounded border border-line bg-cloud px-3 py-2 text-sm"
                placeholder="Product name"
                value={brief.productName}
                onChange={(e) => setBrief({ ...brief, productName: e.target.value })}
              />
              <input
                className="w-full rounded border border-line bg-cloud px-3 py-2 text-sm"
                placeholder="Audience"
                value={brief.audience}
                onChange={(e) => setBrief({ ...brief, audience: e.target.value })}
              />
              <textarea
                className="min-h-16 w-full rounded border border-line bg-cloud px-3 py-2 text-sm"
                placeholder="Primary workflow (happy path)"
                value={brief.primaryWorkflow}
                onChange={(e) => setBrief({ ...brief, primaryWorkflow: e.target.value })}
              />
            </div>
          </div>

          <div className="rounded border border-line bg-white p-4">
            <p className="text-sm font-semibold text-ink">Code intake ({loadedFilePaths.length} files)</p>
            <textarea
              className="mt-2 min-h-32 w-full resize-y rounded border border-line bg-cloud p-2 text-xs leading-5 text-graphite"
              value={filesInput}
              onChange={(e) => setFilesInput(e.target.value)}
            />
            <textarea
              className="mt-2 min-h-20 w-full resize-y rounded border border-line bg-cloud p-2 text-sm text-graphite"
              placeholder="What should BootRise fix or change?"
              value={fixRequest}
              onChange={(e) => setFixRequest(e.target.value)}
            />
            <button
              type="button"
              className="mt-3 w-full rounded bg-signal px-4 py-2 text-sm font-semibold text-white"
              onClick={() => runFixReport()}
            >
              Fix and report
            </button>
          </div>

          {report ? (
            <div className="rounded border border-line bg-white p-4 text-sm">
              <p className="font-semibold text-ink">Last report</p>
              <FileActivityPanel
                items={loadedFilePaths.map((path) => {
                  const fixed = report.fixed.find((f) => f.path === path);
                  const atRisk = report.potentiallyBroken.some((b) => b.includes(path));
                  return {
                    path,
                    status: fixed ? "fixed" : atRisk ? "at-risk" : "planned",
                    detail: fixed?.summary ?? (atRisk ? "Watch dependency" : "Reviewed")
                  };
                })}
                compact
              />
            </div>
          ) : null}

          <div className="rounded border border-line bg-white p-4">
            <p className="text-sm font-semibold text-ink">Export</p>
            <button
              type="button"
              className="mt-2 w-full rounded border border-line px-4 py-2 text-sm font-semibold text-graphite"
              onClick={() => exportBundle("download")}
            >
              Download bundle
            </button>
            <input
              className="mt-2 w-full rounded border border-line bg-cloud px-3 py-2 text-xs"
              placeholder="https://github.com/org/repo"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
            <button
              type="button"
              className="mt-2 w-full rounded bg-ink px-4 py-2 text-sm font-semibold text-white"
              onClick={() => exportBundle("github")}
            >
              Prepare GitHub push
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ThinkingPanel({ steps }: { steps: ThinkingStep[] }) {
  if (steps.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {steps.map((step) => (
        <li key={step.id} className="flex items-start gap-2 text-xs text-graphite">
          <span className="mt-0.5 font-mono text-steel">{step.status === "done" ? "✓" : step.status === "active" ? "…" : "○"}</span>
          <span>
            <span className="font-semibold text-ink">{step.label}</span>
            {step.detail ? <span className="text-steel"> — {step.detail}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FileActivityPanel({ items, compact }: { items: FileActivity[]; compact?: boolean }) {
  return (
    <ul className={`space-y-1 ${compact ? "mt-2" : "mt-3"}`}>
      {items.map((item) => (
        <li key={item.path} className="rounded border border-line bg-cloud px-2 py-1.5 text-xs">
          <span className="font-semibold text-ink">{item.path}</span>
          <span className="text-steel"> · {item.status}</span>
          <p className="text-graphite">{item.detail}</p>
        </li>
      ))}
    </ul>
  );
}
