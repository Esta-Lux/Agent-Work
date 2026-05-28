import type { AuthUser } from "@/lib/auth/types";
import type { LlmChatResult, LlmProviderId } from "@/lib/ai/providers";
import { createProviderChatResponse } from "@/lib/ai/llm-router";
import { assertKillSwitchAllowed, getKillSwitches } from "@/lib/admin/kill-switches";
import {
  SELF_REPOSITORY_ID,
  getSelfRepoRoot
} from "@/lib/admin/self-repo";
import { loadCodebaseMemory, type CodebaseMemorySnapshot } from "@/lib/admin/codebase-memory";
import { capToolOutput, findAdminAgentTool, listAdminAgentTools } from "@/lib/admin/tools/registry";
import type { ToolCall, ToolContext, ToolResult } from "@/lib/admin/tools/types";

export type ToolLoopStopReason = "final_answer" | "max_steps" | "tool_error" | "killed" | "cancelled";

export interface ToolLoopEvent {
  kind: "assistant_message" | "tool_call" | "tool_result" | "stop";
  payload: unknown;
}

export type ProviderChatFn = (input: {
  provider: LlmProviderId;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  system?: string;
  maxOutputTokens?: number;
}) => Promise<LlmChatResult>;

export interface ToolLoopOptions {
  user: AuthUser;
  orgId: string;
  provider: LlmProviderId;
  systemPrompt: string;
  userMessage: string;
  maxSteps?: number;
  memory?: CodebaseMemorySnapshot;
  onEvent?: (event: ToolLoopEvent) => void;
  providerChat?: ProviderChatFn;
  isCancelled?: () => boolean;
  maxOutputTokens?: number;
}

export interface ToolLoopResult {
  finalMessage: string;
  calls: ToolCall[];
  results: ToolResult[];
  stopReason: ToolLoopStopReason;
  steps: number;
}

const SECRET_PATTERNS: RegExp[] = [
  /(?:NVIDIA|OPENAI|GITHUB)_API_KEY[^\s]*/gi,
  /sk-[A-Za-z0-9]{16,}/g,
  /ghp_[A-Za-z0-9]{20,}/g,
  /nvapi-[A-Za-z0-9]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g
];

const DEFAULT_MAX_STEPS = 6;
const TOOL_BYTES_CAP = 32_000;

export function redactSecrets(text: string): string {
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[redacted]");
  }
  return out;
}

function resolveMaxSteps(value: number | undefined): number {
  if (typeof value === "number" && value > 0) return Math.min(value, 20);
  const raw = process.env.BOOTRISE_ADMIN_AGENT_TOOL_MAX_STEPS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 20) : DEFAULT_MAX_STEPS;
}

function buildSystemPrompt(custom: string, memorySummary: string): string {
  const tools = listAdminAgentTools()
    .map((tool) => `- ${tool.id}: ${tool.description}`)
    .join("\n");
  return [
    custom.trim(),
    "",
    "You may call tools by emitting a single line of the form:",
    'TOOL_CALL: {"id":"<step-id>","name":"<tool-id>","arguments":{...}}',
    "After each TOOL_RESULT line is appended to history you may issue another TOOL_CALL or write your final answer.",
    "Reply with plain text (no TOOL_CALL prefix) to finalize.",
    "",
    "Available tools:",
    tools,
    "",
    "Codebase memory:",
    memorySummary
  ].join("\n");
}

function parseToolCallLine(line: string): ToolCall | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("TOOL_CALL:")) return null;
  const json = trimmed.slice("TOOL_CALL:".length).trim();
  try {
    const parsed = JSON.parse(json) as Partial<ToolCall>;
    if (!parsed.name || typeof parsed.name !== "string") return null;
    return {
      id: typeof parsed.id === "string" ? parsed.id : `t_${Date.now().toString(36)}`,
      name: parsed.name,
      arguments: (parsed.arguments && typeof parsed.arguments === "object" ? parsed.arguments : {}) as Record<string, unknown>
    };
  } catch {
    return null;
  }
}

function extractToolCalls(message: string): { calls: ToolCall[]; assistantText: string } {
  const lines = message.split("\n");
  const calls: ToolCall[] = [];
  const passthrough: string[] = [];
  for (const line of lines) {
    const call = parseToolCallLine(line);
    if (call) {
      calls.push(call);
    } else {
      passthrough.push(line);
    }
  }
  return { calls, assistantText: passthrough.join("\n").trim() };
}

async function dispatchTool(call: ToolCall, ctx: ToolContext): Promise<ToolResult> {
  const tool = findAdminAgentTool(call.name);
  if (!tool) {
    return { id: call.id, name: call.name, ok: false, output: null, error: `Unknown tool: ${call.name}` };
  }
  if (tool.killSwitchAction === "agent_shell") {
    if (getKillSwitches().disableAgentShell) {
      return { id: call.id, name: call.name, ok: false, output: null, error: "agent_shell kill switch active" };
    }
  }
  try {
    const output = await tool.execute(call.arguments as never, ctx);
    const capped = capToolOutput(output);
    return { id: call.id, name: call.name, ok: true, output: capped.value, tokenEstimate: JSON.stringify(capped.value).length };
  } catch (err) {
    return {
      id: call.id,
      name: call.name,
      ok: false,
      output: null,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

export async function runToolLoop(opts: ToolLoopOptions): Promise<ToolLoopResult> {
  assertKillSwitchAllowed("admin_agent");
  assertKillSwitchAllowed("advanced_admin_agent");
  assertKillSwitchAllowed("agent_tool_use");

  const maxSteps = resolveMaxSteps(opts.maxSteps);
  const memory = opts.memory ?? (await loadCodebaseMemory());
  const ctx: ToolContext = {
    repoRoot: getSelfRepoRoot(),
    user: opts.user,
    orgId: opts.orgId,
    memory
  };

  const memorySummary = `Repo ${SELF_REPOSITORY_ID} · ${memory.fileCount} files · ${memory.symbolCount} symbols · routes ${memory.routeMap.length}`;
  const systemPrompt = buildSystemPrompt(opts.systemPrompt, memorySummary);
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  let currentMessage = opts.userMessage;

  const calls: ToolCall[] = [];
  const results: ToolResult[] = [];
  let appendedBytes = 0;
  let stopReason: ToolLoopStopReason = "max_steps";
  let finalMessage = "";
  const providerChat: ProviderChatFn = opts.providerChat ?? createProviderChatResponse;

  for (let step = 0; step < maxSteps; step++) {
    if (opts.isCancelled?.()) {
      stopReason = "cancelled";
      finalMessage = "Cancelled by admin before step completed.";
      opts.onEvent?.({ kind: "stop", payload: { reason: stopReason, step } });
      break;
    }
    const response = await providerChat({
      provider: opts.provider,
      message: currentMessage,
      history,
      system: systemPrompt,
      maxOutputTokens: opts.maxOutputTokens
    });
    const safeText = redactSecrets(response.text ?? "");
    opts.onEvent?.({ kind: "assistant_message", payload: { step, text: safeText } });
    history.push({ role: "user", content: currentMessage });
    history.push({ role: "assistant", content: safeText });

    const { calls: stepCalls, assistantText } = extractToolCalls(safeText);
    if (stepCalls.length === 0) {
      finalMessage = assistantText || safeText;
      stopReason = "final_answer";
      opts.onEvent?.({ kind: "stop", payload: { reason: stopReason, step } });
      break;
    }

    const stepResults: ToolResult[] = [];
    for (const call of stepCalls) {
      if (opts.isCancelled?.()) {
        stopReason = "cancelled";
        finalMessage = "Cancelled by admin during tool execution.";
        opts.onEvent?.({ kind: "stop", payload: { reason: stopReason, step } });
        return { finalMessage, calls, results, stopReason, steps: calls.length };
      }
      opts.onEvent?.({ kind: "tool_call", payload: call });
      calls.push(call);
      const result = await dispatchTool(call, ctx);
      results.push(result);
      stepResults.push(result);
      opts.onEvent?.({ kind: "tool_result", payload: result });
    }

    const resultPayload = stepResults
      .map((r) => `TOOL_RESULT: ${JSON.stringify({ id: r.id, name: r.name, ok: r.ok, error: r.error, output: r.output })}`)
      .join("\n");
    appendedBytes += resultPayload.length;
    if (appendedBytes > TOOL_BYTES_CAP) {
      stopReason = "max_steps";
      finalMessage = assistantText || "Tool output budget exhausted.";
      opts.onEvent?.({ kind: "stop", payload: { reason: stopReason, step } });
      break;
    }
    currentMessage = resultPayload;
  }

  if (!finalMessage) {
    finalMessage = "Tool loop completed without a final answer.";
  }

  return { finalMessage, calls, results, stopReason, steps: calls.length };
}
