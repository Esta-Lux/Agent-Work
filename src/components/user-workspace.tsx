"use client";

import { useMemo, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import type { ProjectBrief, WorkspaceFixReport } from "@/lib/workspace/workspace-agent";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SAMPLE_FILES = JSON.stringify(
  [
    {
      path: "src/lib/auth/session.ts",
      content: "export function getSession() { return null; }\nexport function requireSession() { throw new Error('missing'); }"
    },
    {
      path: "src/app/api/profile/route.ts",
      content: "import { getSession } from '@/lib/auth/session';\nexport async function GET() { const s = getSession(); return Response.json({ ok: !!s }); }"
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

export function UserWorkspace() {
  const [brief, setBrief] = useState<ProjectBrief>(DEFAULT_BRIEF);
  const [filesInput, setFilesInput] = useState(SAMPLE_FILES);
  const [fixRequest, setFixRequest] = useState("Fix session handling so profile API does not throw when unauthenticated");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Welcome to BootRise. Tell me what you are building, paste your code, and I will plan fixes, show blast radius, and help you export to GitHub or a download bundle."
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [report, setReport] = useState<WorkspaceFixReport | null>(null);
  const [repositoryId, setRepositoryId] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [useOpenAI, setUseOpenAI] = useState(true);

  const hasCode = useMemo(() => {
    try {
      const parsed = JSON.parse(filesInput) as unknown[];
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }, [filesInput]);

  const briefReady = brief.productName.trim().length > 0 && brief.primaryWorkflow.trim().length > 0;

  function parseFiles() {
    return JSON.parse(filesInput) as Array<{ path: string; content: string }>;
  }

  async function sendChat(message: string) {
    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setStatus("Thinking");

    try {
      const response = await fetch("/api/workspace/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: nextMessages.slice(-8),
          projectBrief: briefReady ? brief : undefined,
          hasCode,
          lastReport: report,
          useOpenAI
        })
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Chat failed.");
      setMessages([...nextMessages, { role: "assistant", content: data.reply ?? "No response." }]);
      setStatus("Ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chat failed.");
      setStatus("Blocked");
    }
  }

  async function runFixReport() {
    setError(null);
    setStatus("Analyzing and fixing");

    try {
      const files = parseFiles();
      const response = await fetch("/api/workspace/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: fixRequest, files })
      });
      const data = (await response.json()) as {
        report: WorkspaceFixReport;
        repositoryId: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Fix workflow failed.");
      setReport(data.report);
      setRepositoryId(data.repositoryId);
      setStatus("Report ready");
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: [
            `Fix report for: ${data.report.plan.intent.interpretedGoal}`,
            `Fixed: ${data.report.fixed.map((f) => f.path).join(", ") || "none"}`,
            `May break: ${data.report.potentiallyBroken.slice(0, 5).join(", ") || "none flagged"}`,
            ...data.report.guidanceForBuilder.map((g) => `- ${g}`)
          ].join("\n")
        }
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Fix workflow failed.");
      setStatus("Blocked");
    }
  }

  async function exportBundle(mode: "download" | "github") {
    setError(null);
    setStatus(mode === "download" ? "Preparing download" : "Preparing GitHub export");

    try {
      if (!briefReady) throw new Error("Complete the product brief before exporting.");
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
          { role: "assistant", content: `Downloaded ${data.downloadName}. Upload it anywhere or extract into a new repo.` }
        ]);
      }

      if (mode === "github" && data.pushSteps) {
        setMessages((current) => [
          ...current,
          { role: "assistant", content: ["GitHub export prepared:", ...data.pushSteps!.map((s, i) => `${i + 1}. ${s}`)].join("\n") }
        ]);
      }

      setStatus("Ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Export failed.");
      setStatus("Blocked");
    }
  }

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
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded p-3 text-sm leading-6 ${
                  message.role === "user" ? "bg-cloud text-ink" : "border border-line bg-white text-graphite"
                }`}
              >
                <p className="mb-1 text-xs font-semibold uppercase text-steel">{message.role}</p>
                <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
              </div>
            ))}
          </div>
          <div className="border-t border-line p-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-graphite"
                onClick={() => sendChat("What should I build first for my MVP?")}
              >
                MVP scope
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
                onClick={() => sendChat("How do I export to GitHub?")}
              >
                Export help
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded border border-line bg-cloud px-3 py-2 text-sm text-ink"
                placeholder="Ask BootRise about your build, fixes, or features..."
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
            <p className="mt-1 text-xs text-steel">BootRise uses this from day one through deployment.</p>
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
              <label className="flex items-center gap-2 text-xs text-graphite">
                <input
                  type="checkbox"
                  checked={brief.longBuild}
                  onChange={(e) => setBrief({ ...brief, longBuild: e.target.checked })}
                />
                Complex / long-running build
              </label>
            </div>
          </div>

          <div className="rounded border border-line bg-white p-4">
            <p className="text-sm font-semibold text-ink">Code intake</p>
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
              onClick={runFixReport}
            >
              Fix and report
            </button>
          </div>

          {report ? (
            <div className="rounded border border-line bg-white p-4 text-sm">
              <p className="font-semibold text-ink">Last report</p>
              <p className="mt-2 text-graphite">Fixed: {report.fixed.length} file(s)</p>
              <p className="text-graphite">Watch: {report.potentiallyBroken.length} dependent area(s)</p>
              <ul className="mt-2 list-inside list-disc text-xs text-steel">
                {report.howFixed.slice(0, 3).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
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
              placeholder="https://github.com/org/repo.git"
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
