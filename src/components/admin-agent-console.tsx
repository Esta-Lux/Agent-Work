"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PanelShell } from "@/components/ui/panel-shell";
import { StatusPill } from "@/components/status-pill";
import { AdminProviderKeysPanel } from "@/components/admin-provider-keys-panel";

type AgentMode = "chat" | "plan" | "fix";
type InspectorTab = "plan" | "diff" | "verify" | "agents" | "trace" | "memory";

interface TraceEvent {
  kind: string;
  agent?: "planner" | "coder" | "reviewer";
  payload: unknown;
  at: string;
}

interface MemorySnapshot {
  generatedAt: string;
  repositoryId: string;
  fileCount: number;
  symbolCount: number;
  topHubs: string[];
  routeMap: Array<{ path: string; methods: string[]; file: string }>;
  recentEdits: Array<{ path: string; summary?: string; appliedAt: string }>;
  priorPlans: Array<{ goal: string; createdAt: string; files: string[] }>;
}

interface AgentRunSummary {
  id: string;
  agent: "planner" | "coder" | "reviewer";
  status: "running" | "complete" | "failed";
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
  pendingFixId?: string;
  events?: Array<{ kind: string; payload: unknown; at?: string }>;
}

interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
}

interface SelfFileEntry {
  path: string;
  sizeBytes: number;
}

interface SelfFilesResponse {
  repositoryId: string;
  remoteUrl: string | null;
  defaultBranch: string;
  files: SelfFileEntry[];
}

interface PlanPayload {
  id: string;
  intent: { request: string; interpretedGoal: string; businessImpact: string };
  impact: { files: string[]; services: string[]; apis: string[]; databaseSchemas: string[]; blastRadius: string[] };
  risk: { level: string; reasons: string[] };
  steps: Array<{ id: string; title: string; summary: string; targetFiles: string[] }>;
  rollbackStrategy: string;
}

interface PatchSummary {
  path: string;
  summary: string;
  beforeBytes: number;
  afterBytes: number;
}

interface DiffFile {
  path: string;
  before: string;
  after: string;
  summary: string;
  language?: string;
}

interface DiffResponse {
  pendingFixId: string;
  status: string;
  request: string;
  diff: { planId: string; files: DiffFile[]; riskNotes: string[] };
  plan: PlanPayload;
  patches: PatchSummary[];
}

interface FixResponse {
  pendingFixId: string;
  filesConsidered: number;
  report: { plainEnglishSummary?: string; plan?: PlanPayload };
}

interface ChatResponse {
  reply: string;
  provider: string;
  model: string;
  filesConsidered: number;
  contextSummary: string;
  stopReason: string | null;
}

interface PlanResponse {
  plan: PlanPayload;
  provider: string;
  model: string;
  fileCount: number;
}

interface PushResponse {
  mode: "draft_pr" | "direct";
  branch: string;
  url: string;
  commitSha?: string;
  pushed: string[];
  unpushed: string[];
}

const PUSH_PHRASE = "PUSH TO MAIN";

export function AdminAgentConsole() {
  const [mode, setMode] = useState<AgentMode>("chat");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "BootRise admin self-agent is online. Use Chat to ask about the codebase, Plan to scope a change, or Fix to generate a multi-file patch you can approve and push."
    }
  ]);
  const [filesResp, setFilesResp] = useState<SelfFilesResponse | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanPayload | null>(null);
  const [pendingFixId, setPendingFixId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [diff, setDiff] = useState<DiffResponse | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("plan");
  const [agentRuns, setAgentRuns] = useState<AgentRunSummary[]>([]);
  const [pushPhrase, setPushPhrase] = useState("");
  const [pushPreview, setPushPreview] = useState<PushResponse | null>(null);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [memory, setMemory] = useState<MemorySnapshot | null>(null);
  const [memoryBusy, setMemoryBusy] = useState(false);

  const history = useMemo(
    () =>
      turns.filter((turn) => turn.id !== "welcome").slice(-8).map((turn) => ({ role: turn.role, content: turn.content })),
    [turns]
  );

  const loadFiles = useCallback(async (refresh = false) => {
    try {
      setFilesError(null);
      const res = await fetch(`/api/admin/agent/files${refresh ? "?refresh=1" : ""}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Files API failed." }))).error ?? "Files API failed.");
      setFilesResp((await res.json()) as SelfFilesResponse);
    } catch (caught) {
      setFilesError(caught instanceof Error ? caught.message : "Could not load self-repo files.");
    }
  }, []);

  useEffect(() => {
    void loadFiles(false);
  }, [loadFiles]);

  function appendTurn(turn: ChatTurn) {
    setTurns((prev) => [...prev, turn]);
  }

  async function loadDiff(id: string) {
    try {
      const res = await fetch(`/api/admin/agent/diff?pendingFixId=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Diff API failed." }))).error ?? "Diff API failed.");
      const payload = (await res.json()) as DiffResponse;
      setDiff(payload);
      setPlan(payload.plan);
      setPendingStatus(payload.status);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load diff.");
    }
  }

  async function loadAgentRuns(id: string) {
    try {
      const res = await fetch(`/api/admin/agent/runs?pendingFixId=${encodeURIComponent(id)}&limit=10`);
      if (!res.ok) return;
      const body = (await res.json()) as { runs?: AgentRunSummary[] };
      if (Array.isArray(body.runs)) setAgentRuns(body.runs);
    } catch {
      /* non-fatal */
    }
  }

  const loadMemory = useCallback(async (refresh = false) => {
    setMemoryBusy(true);
    try {
      const res = refresh
        ? await fetch("/api/admin/agent/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh: true }) })
        : await fetch("/api/admin/agent/memory");
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Memory load failed." }))).error ?? "Memory load failed.");
      const body = (await res.json()) as { snapshot?: MemorySnapshot };
      if (body.snapshot) setMemory(body.snapshot);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Memory load failed.");
    } finally {
      setMemoryBusy(false);
    }
  }, []);

  function openStream(id: string): EventSource {
    const es = new EventSource(`/api/admin/agent/runs/stream?streamId=${encodeURIComponent(id)}`);
    setStreaming(true);
    es.addEventListener("agent", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as TraceEvent;
        setTrace((prev) => (prev.length > 400 ? [...prev.slice(-300), payload] : [...prev, payload]));
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("ready", () => {
      /* ready */
    });
    es.onerror = () => {
      setStreaming(false);
      es.close();
    };
    return es;
  }

  async function cancelRun() {
    if (!streamId) return;
    try {
      await fetch("/api/admin/agent/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId })
      });
      setStatus("Cancellation requested");
    } catch {
      /* non-fatal */
    }
  }

  async function submit() {
    const message = input.trim();
    if (!message || busy) return;
    setBusy(true);
    setError(null);
    setStatus(mode === "chat" ? "Thinking…" : mode === "plan" ? "Planning…" : "Generating patches…");
    const userTurn: ChatTurn = { id: `u-${Date.now()}`, role: "user", content: message };
    appendTurn(userTurn);
    setInput("");

    try {
      if (mode === "chat") {
        const res = await fetch("/api/admin/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history })
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Chat failed." }))).error ?? "Chat failed.");
        const data = (await res.json()) as ChatResponse;
        appendTurn({
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          model: `${data.provider} · ${data.model}`
        });
        setStatus(`Ready · ${data.filesConsidered} files in context`);
      } else if (mode === "plan") {
        const res = await fetch("/api/admin/agent/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request: message })
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Plan failed." }))).error ?? "Plan failed.");
        const data = (await res.json()) as PlanResponse;
        setPlan(data.plan);
        setInspectorTab("plan");
        appendTurn({
          id: `a-${Date.now()}`,
          role: "assistant",
          content: `Plan ready — ${data.plan.intent.interpretedGoal}\n\nRisk: ${data.plan.risk.level}\nFiles in scope: ${data.plan.impact.files.length}`,
          model: `${data.provider} · ${data.model}`
        });
        setStatus(`Plan generated · ${data.fileCount} files considered`);
      } else {
        const newStreamId = `stream-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        setStreamId(newStreamId);
        setTrace([]);
        setInspectorTab("trace");
        const es = openStream(newStreamId);
        try {
          const res = await fetch("/api/admin/agent/fix", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ request: message, streamId: newStreamId })
          });
          if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Fix failed." }))).error ?? "Fix failed.");
          const data = (await res.json()) as FixResponse;
          setPendingFixId(data.pendingFixId);
          setPendingStatus("pending_approval");
          if (data.report.plan) setPlan(data.report.plan);
          await loadDiff(data.pendingFixId);
          await loadAgentRuns(data.pendingFixId);
          setInspectorTab("diff");
          appendTurn({
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.report.plainEnglishSummary ?? `Pending fix ${data.pendingFixId} created. Review the diff and approve or reject.`
          });
          setStatus(`Pending fix · ${data.pendingFixId.slice(0, 12)}…`);
        } finally {
          es.close();
          setStreaming(false);
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed.");
      setStatus("Error");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!pendingFixId || busy) return;
    setBusy(true);
    setError(null);
    setStatus("Approving…");
    try {
      const res = await fetch("/api/admin/agent/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingFixId })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Approve failed." }))).error ?? "Approve failed.");
      const data = (await res.json()) as { applied: number; previewUrl: string };
      setPendingStatus("approved");
      appendTurn({
        id: `a-${Date.now()}`,
        role: "assistant",
        content: `Approved. ${data.applied} files written to self-repo snapshot. Push to GitHub when ready.`
      });
      setStatus(`Approved · ${data.applied} files`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Approve failed.");
      setStatus("Error");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!pendingFixId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/agent/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingFixId })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Reject failed." }))).error ?? "Reject failed.");
      setPendingStatus("rejected");
      appendTurn({ id: `a-${Date.now()}`, role: "assistant", content: "Rejected. The pending fix has been discarded." });
      setPendingFixId(null);
      setDiff(null);
      setStatus("Rejected");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reject failed.");
      setStatus("Error");
    } finally {
      setBusy(false);
    }
  }

  async function push(opts: { confirmPushToMain: boolean }) {
    if (!pendingFixId || busy) return;
    if (opts.confirmPushToMain && pushPhrase !== PUSH_PHRASE) {
      setError(`Type ${PUSH_PHRASE} exactly to enable direct push to main.`);
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(opts.confirmPushToMain ? "Pushing to main…" : "Opening draft PR…");
    try {
      const res = await fetch("/api/admin/agent/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingFixId,
          confirmPushToMain: opts.confirmPushToMain,
          confirmationPhrase: opts.confirmPushToMain ? PUSH_PHRASE : undefined
        })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Push failed." }))).error ?? "Push failed.");
      const data = (await res.json()) as PushResponse;
      setPushPreview(data);
      setPushPhrase("");
      appendTurn({
        id: `a-${Date.now()}`,
        role: "assistant",
        content:
          data.mode === "direct"
            ? `Pushed directly to ${data.branch} (${data.commitSha?.slice(0, 8) ?? ""}). ${data.pushed.length} files committed.`
            : `Draft PR opened on ${data.branch}: ${data.url}`
      });
      setStatus(data.mode === "direct" ? "Pushed to main" : "Draft PR opened");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Push failed.");
      setStatus("Error");
    } finally {
      setBusy(false);
    }
  }

  const fileList = filesResp?.files ?? [];
  const showActions = Boolean(pendingFixId && pendingStatus !== "rejected");
  const canPush = pendingStatus === "approved";

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
      <PanelShell title="Self-repo files" eyebrow="Workspace" description={filesResp?.remoteUrl ?? "Local snapshot"}>
        <div className="mb-2 flex items-center justify-between text-[11px] text-steel">
          <span>{fileList.length} files</span>
          <button
            type="button"
            className="font-semibold text-signal underline"
            onClick={() => loadFiles(true)}
            disabled={busy}
          >
            Resync
          </button>
        </div>
        {filesError ? <p className="mb-2 text-xs text-red-600">{filesError}</p> : null}
        <ul className="max-h-[480px] overflow-y-auto text-[11px] leading-5 text-graphite">
          {fileList.slice(0, 600).map((file) => (
            <li key={file.path} className="border-b border-line/40 py-1 font-mono">
              {file.path}
            </li>
          ))}
          {fileList.length > 600 ? <li className="py-1 text-steel">…and {fileList.length - 600} more</li> : null}
        </ul>
      </PanelShell>

      <PanelShell title="Admin self-agent" eyebrow="BootRise" description="Codebase-aware chat, planning, and multi-file patches against this repo.">
        <AdminProviderKeysPanel />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusPill label={status} />
          {pendingStatus ? <StatusPill label={`fix: ${pendingStatus}`} tone={pendingStatus === "approved" ? "passed" : "neutral"} /> : null}
          <div className="ml-auto inline-flex overflow-hidden rounded-lg border border-line text-xs">
            {(["chat", "plan", "fix"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 font-semibold ${mode === m ? "bg-ink text-white" : "bg-white text-graphite hover:bg-cloud"}`}
              >
                {m === "chat" ? "Chat" : m === "plan" ? "Plan" : "Fix"}
              </button>
            ))}
          </div>
        </div>

        {error ? <Alert tone="danger" title="Admin agent error" className="mb-3">{error}</Alert> : null}

        <div className="mb-3 max-h-[420px] space-y-3 overflow-y-auto rounded-lg border border-line bg-white p-3">
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={`rounded-lg px-3 py-2 text-sm ${turn.role === "user" ? "bg-cloud text-ink" : "bg-white text-graphite"} border border-line/60`}
            >
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-steel">
                {turn.role === "user" ? "You" : turn.model ? `Agent · ${turn.model}` : "Agent"}
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-5">{turn.content}</pre>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              mode === "chat"
                ? "Ask about the BootRise codebase…"
                : mode === "plan"
                  ? "Describe the change you want to scope (no patches yet)…"
                  : "Describe the change you want the agent to patch across files…"
            }
            rows={3}
            className="w-full rounded-lg border border-line bg-white p-3 text-sm"
            disabled={busy}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => void submit()} disabled={busy || !input.trim()}>
              {mode === "chat" ? "Send" : mode === "plan" ? "Generate plan" : "Generate patches"}
            </Button>
            {streaming && streamId ? (
              <Button type="button" variant="secondary" onClick={() => void cancelRun()}>
                Cancel run
              </Button>
            ) : null}
            {showActions ? (
              <>
                <Button type="button" variant="secondary" onClick={() => void approve()} disabled={busy || pendingStatus !== "pending_approval"}>
                  Approve
                </Button>
                <Button type="button" variant="secondary" onClick={() => void reject()} disabled={busy || pendingStatus === "rejected"}>
                  Reject
                </Button>
                <Button type="button" variant="secondary" onClick={() => void push({ confirmPushToMain: false })} disabled={busy || !canPush}>
                  Open Draft PR
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {showActions && canPush ? (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50/60 p-3 text-xs">
            <p className="mb-2 font-semibold text-red-700">Direct push to {filesResp?.defaultBranch ?? "main"} (danger)</p>
            <p className="mb-2 text-red-600">
              This bypasses the draft PR and commits directly. Type <span className="font-mono">{PUSH_PHRASE}</span> to enable.
            </p>
            <div className="flex items-center gap-2">
              <input
                value={pushPhrase}
                onChange={(event) => setPushPhrase(event.target.value)}
                placeholder={PUSH_PHRASE}
                className="flex-1 rounded border border-red-300 bg-white px-2 py-1 font-mono text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void push({ confirmPushToMain: true })}
                disabled={busy || pushPhrase !== PUSH_PHRASE}
              >
                Push to {filesResp?.defaultBranch ?? "main"}
              </Button>
            </div>
            {pushPreview && pushPreview.mode === "direct" ? (
              <p className="mt-2 text-green-700">
                Committed {pushPreview.pushed.length} files at {pushPreview.commitSha?.slice(0, 8)} on {pushPreview.branch}.
              </p>
            ) : null}
          </div>
        ) : null}
      </PanelShell>

      <PanelShell title="Inspector" eyebrow="Plan · Diff · Trace · Verify · Agents · Memory">
        <div className="mb-3 inline-flex flex-wrap overflow-hidden rounded-lg border border-line text-[11px]">
          {(["plan", "diff", "trace", "verify", "agents", "memory"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setInspectorTab(tab);
                if (tab === "memory" && !memory) void loadMemory(false);
              }}
              className={`px-3 py-1.5 font-semibold ${inspectorTab === tab ? "bg-ink text-white" : "bg-white text-graphite hover:bg-cloud"}`}
            >
              {tab === "plan" ? "Plan" : tab === "diff" ? "Diff" : tab === "trace" ? `Trace${trace.length ? ` · ${trace.length}` : ""}` : tab === "verify" ? "Verify" : tab === "agents" ? "Agents" : "Memory"}
            </button>
          ))}
        </div>
        <Inspector
          tab={inspectorTab}
          plan={plan}
          diff={diff}
          pushPreview={pushPreview}
          agentRuns={agentRuns}
          trace={trace}
          streaming={streaming}
          memory={memory}
          memoryBusy={memoryBusy}
          onRefreshMemory={() => void loadMemory(true)}
        />
      </PanelShell>
    </div>
  );
}

function Inspector({
  tab,
  plan,
  diff,
  pushPreview,
  agentRuns,
  trace,
  streaming,
  memory,
  memoryBusy,
  onRefreshMemory
}: {
  tab: InspectorTab;
  plan: PlanPayload | null;
  diff: DiffResponse | null;
  pushPreview: PushResponse | null;
  agentRuns: AgentRunSummary[];
  trace: TraceEvent[];
  streaming: boolean;
  memory: MemorySnapshot | null;
  memoryBusy: boolean;
  onRefreshMemory: () => void;
}) {
  if (tab === "trace") {
    if (!streaming && trace.length === 0) {
      return <p className="text-xs text-steel">Run Fix to see live planner/coder/reviewer events here.</p>;
    }
    return (
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <StatusPill label={streaming ? "live" : "ended"} tone={streaming ? "pending" : "neutral"} />
          <span className="text-steel">{trace.length} events</span>
        </div>
        <ol className="max-h-[440px] space-y-1 overflow-auto rounded border border-line bg-white p-2">
          {trace.map((event, index) => (
            <li key={`${event.at}-${index}`} className="border-b border-line/40 pb-1 last:border-b-0">
              <div className="flex items-center justify-between text-[10px] text-steel">
                <span>
                  {event.agent ? <span className="mr-1 font-semibold text-ink">{event.agent}</span> : null}
                  {event.kind}
                </span>
                <span>{new Date(event.at).toLocaleTimeString()}</span>
              </div>
              <pre className="mt-0.5 whitespace-pre-wrap font-mono text-[10px] leading-4 text-graphite">{summarizeTracePayload(event.payload)}</pre>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  if (tab === "memory") {
    return (
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-steel">{memory ? `Generated ${new Date(memory.generatedAt).toLocaleString()}` : "Not loaded."}</span>
          <button type="button" className="cursor-pointer rounded border border-line px-2 py-0.5 text-[11px]" disabled={memoryBusy} onClick={onRefreshMemory}>
            {memoryBusy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {!memory ? <p className="text-steel">Loading codebase memory…</p> : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded bg-cloud p-2"><p className="text-steel">Files</p><p className="text-lg font-semibold text-ink">{memory.fileCount}</p></div>
              <div className="rounded bg-cloud p-2"><p className="text-steel">Symbols</p><p className="text-lg font-semibold text-ink">{memory.symbolCount}</p></div>
            </div>
            <div>
              <p className="mb-1 font-semibold text-ink">Top hubs</p>
              <ul className="space-y-0.5">
                {memory.topHubs.slice(0, 10).map((h) => (<li key={h} className="font-mono text-[11px] text-graphite">{h}</li>))}
              </ul>
            </div>
            <div>
              <p className="mb-1 font-semibold text-ink">Routes ({memory.routeMap.length})</p>
              <ul className="max-h-[140px] space-y-0.5 overflow-auto">
                {memory.routeMap.slice(0, 20).map((r) => (
                  <li key={r.path} className="font-mono text-[11px] text-graphite">
                    <span className="font-semibold text-ink">{r.methods.join("/")}</span> {r.path}
                  </li>
                ))}
              </ul>
            </div>
            {memory.priorPlans.length ? (
              <div>
                <p className="mb-1 font-semibold text-ink">Recent plans</p>
                <ul className="space-y-0.5">
                  {memory.priorPlans.slice(0, 6).map((p, i) => (
                    <li key={i} className="text-[11px] text-graphite">{new Date(p.createdAt).toLocaleDateString()} · {p.goal}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }
  if (tab === "agents") {
    if (agentRuns.length === 0) {
      return <p className="text-xs text-steel">Run Fix to populate planner / coder / reviewer agent runs.</p>;
    }
    return (
      <div className="space-y-2 text-xs text-graphite">
        <div className="flex flex-wrap gap-2">
          {(["planner", "coder", "reviewer"] as const).map((role) => {
            const run = agentRuns.find((r) => r.agent === role);
            const label = run ? `${role} ${run.status}` : `${role} —`;
            const tone =
              run?.status === "complete" ? "passed" : run?.status === "failed" ? "failed" : run ? "pending" : "neutral";
            return <StatusPill key={role} label={label} tone={tone as never} />;
          })}
        </div>
        {agentRuns.map((run) => (
          <details key={run.id} className="rounded border border-line bg-white p-2">
            <summary className="cursor-pointer font-mono text-[11px] text-ink">
              {run.agent} · {run.status} · {(run.events ?? []).length} events
            </summary>
            {run.errorMessage ? <p className="mt-1 text-critical">{run.errorMessage}</p> : null}
            <ul className="mt-1 max-h-[240px] overflow-auto text-[11px] text-steel">
              {(run.events ?? []).slice(0, 30).map((event, i) => (
                <li key={i}>{event.kind}: {typeof event.payload === "string" ? event.payload : JSON.stringify(event.payload).slice(0, 160)}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    );
  }
  if (tab === "plan") {
    if (!plan) return <p className="text-xs text-steel">Run Plan or Fix to populate the plan view.</p>;
    return (
      <div className="space-y-3 text-xs text-graphite">
        <div>
          <p className="font-semibold text-ink">Goal</p>
          <p>{plan.intent.interpretedGoal}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Business impact</p>
          <p>{plan.intent.businessImpact}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Risk · {plan.risk.level}</p>
          <ul className="list-disc pl-4">
            {plan.risk.reasons.slice(0, 6).map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-ink">Impact</p>
          <p>Files: {plan.impact.files.length} · APIs: {plan.impact.apis.length} · Schemas: {plan.impact.databaseSchemas.length}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Steps</p>
          <ol className="list-decimal pl-4">
            {plan.steps.slice(0, 8).map((step) => (
              <li key={step.id} className="mb-1">
                <span className="font-semibold text-ink">{step.title}</span>
                <span className="block text-steel">{step.summary}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="font-semibold text-ink">Rollback</p>
          <p>{plan.rollbackStrategy}</p>
        </div>
      </div>
    );
  }

  if (tab === "diff") {
    if (!diff) return <p className="text-xs text-steel">Run Fix to generate a patch diff.</p>;
    return (
      <div className="space-y-3 text-xs">
        <p className="text-steel">{diff.diff.files.length} files patched · {diff.diff.riskNotes.length} risk notes</p>
        <div className="max-h-[440px] space-y-3 overflow-y-auto">
          {diff.diff.files.map((file) => (
            <details key={file.path} className="rounded border border-line bg-white p-2">
              <summary className="cursor-pointer font-mono text-[11px] text-ink">{file.path}</summary>
              <p className="mt-1 text-steel">{file.summary}</p>
              <pre className="mt-2 max-h-[260px] overflow-auto rounded bg-cloud p-2 text-[10px] leading-4">{renderUnifiedDiff(file.before, file.after)}</pre>
            </details>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-xs text-graphite">
      {pushPreview ? (
        <>
          <p>
            <span className="font-semibold text-ink">Mode:</span> {pushPreview.mode === "direct" ? "Direct push" : "Draft PR"}
          </p>
          <p>
            <span className="font-semibold text-ink">Branch:</span> {pushPreview.branch}
          </p>
          {pushPreview.commitSha ? (
            <p>
              <span className="font-semibold text-ink">Commit:</span> {pushPreview.commitSha.slice(0, 12)}
            </p>
          ) : null}
          <p>
            <a className="text-signal underline" href={pushPreview.url} target="_blank" rel="noreferrer">
              {pushPreview.url}
            </a>
          </p>
          <p>{pushPreview.pushed.length} files pushed</p>
          {pushPreview.unpushed.length ? (
            <div>
              <p className="font-semibold text-ink">Unpushed</p>
              <ul className="list-disc pl-4 text-steel">
                {pushPreview.unpushed.slice(0, 12).map((entry, index) => (
                  <li key={index}>{entry}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-steel">Verification appears here after the agent pushes a fix.</p>
      )}
    </div>
  );
}

function renderUnifiedDiff(before: string, after: string): string {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const max = Math.max(beforeLines.length, afterLines.length);
  const out: string[] = [];
  for (let index = 0; index < max; index += 1) {
    const b = beforeLines[index];
    const a = afterLines[index];
    if (b === a) {
      if (b !== undefined) out.push(`  ${b}`);
      continue;
    }
    if (b !== undefined) out.push(`- ${b}`);
    if (a !== undefined) out.push(`+ ${a}`);
  }
  return out.join("\n");
}

function summarizeTracePayload(payload: unknown): string {
  if (payload == null) return "";
  if (typeof payload === "string") return payload.slice(0, 220);
  try {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text.slice(0, 220);
    if (typeof obj.name === "string" || typeof obj.tool === "string") {
      const tool = obj.name ?? obj.tool;
      const argStr = obj.args ? JSON.stringify(obj.args).slice(0, 140) : "";
      return `${String(tool)}${argStr ? ` · ${argStr}` : ""}`;
    }
    if (typeof obj.output === "string") return obj.output.slice(0, 220);
    return JSON.stringify(obj).slice(0, 220);
  } catch {
    return String(payload).slice(0, 220);
  }
}

