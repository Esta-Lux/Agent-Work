import type { AuthUser } from "@/lib/auth/types";
import type { LlmProviderId } from "@/lib/ai/providers";
import { runToolLoop, type ProviderChatFn } from "@/lib/admin/agent-tool-loop";
import type { CodebaseMemorySnapshot } from "@/lib/admin/codebase-memory";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ChangePlan } from "@/lib/types/core";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import { generateRealPatches } from "@/lib/workspace/real-patches";
import { completeAgentRun, createAgentRun, recordEvent, type AgentRun } from "@/lib/admin/agents/types";

const CODER_SYSTEM = [
  "You are the Coder agent for the BootRise admin self-agent.",
  "Inspect target files using read-file / list-symbols / query-memory before proposing changes.",
  "Return a fenced JSON block with shape:",
  '{"patches":[{"path":"...","before":"...","after":"...","summary":"..."}]}',
  "Each `before` must match the current file content exactly. Keep patches minimal and reversible."
].join("\n");

export interface CoderInput {
  user: AuthUser;
  orgId: string;
  plan: ChangePlan;
  files: SourceFileInput[];
  provider: LlmProviderId;
  memory: CodebaseMemorySnapshot;
  request?: string;
  projectId?: string;
  repositoryId?: string;
  providerChat?: ProviderChatFn;
  onEvent?: (event: import("@/lib/admin/agent-tool-loop").ToolLoopEvent) => void;
  isCancelled?: () => boolean;
}

export interface CoderOutput {
  patches: ProposedPatch[];
  run: AgentRun;
  source: "agent" | "fallback";
}

function parsePatches(text: string): ProposedPatch[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1)) as { patches?: unknown };
    if (!Array.isArray(parsed.patches)) return [];
    const out: ProposedPatch[] = [];
    for (const entry of parsed.patches as Array<Record<string, unknown>>) {
      if (
        typeof entry.path === "string" &&
        typeof entry.before === "string" &&
        typeof entry.after === "string"
      ) {
        out.push({
          path: entry.path,
          before: entry.before,
          after: entry.after,
          summary: typeof entry.summary === "string" ? entry.summary : "Agent-proposed patch"
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function runCoderAgent(input: CoderInput): Promise<CoderOutput> {
  const run = createAgentRun("coder");
  try {
    const targets = input.plan.impact.files.slice(0, 6).join(", ") || "(plan supplied no impacted files)";
    const userMsg = [
      `Plan goal: ${input.plan.intent.interpretedGoal}`,
      `Impacted files: ${targets}`,
      "Steps:",
      ...input.plan.steps.map((s) => `- ${s.title}: ${s.summary}`)
    ].join("\n");

    const loop = await runToolLoop({
      user: input.user,
      orgId: input.orgId,
      provider: input.provider,
      systemPrompt: CODER_SYSTEM,
      userMessage: userMsg,
      maxSteps: 6,
      memory: input.memory,
      providerChat: input.providerChat,
      isCancelled: input.isCancelled,
      maxOutputTokens: 16000,
      onEvent: (event) => {
        recordEvent(run, event);
        input.onEvent?.(event);
      }
    });

    let patches = parsePatches(loop.finalMessage);
    let source: CoderOutput["source"] = "agent";
    if (patches.length === 0) {
      const fallback = await generateRealPatches({
        provider: input.provider,
        request: input.request ?? input.plan.intent.request,
        files: input.files,
        plan: input.plan,
        orgId: input.orgId,
        projectId: input.projectId ?? "admin-self",
        repositoryId: input.repositoryId ?? "admin-self"
      });
      patches = fallback.patches;
      source = "fallback";
    }

    completeAgentRun(run);
    return { patches, run, source };
  } catch (error) {
    completeAgentRun(run, error instanceof Error ? error : String(error));
    throw error;
  }
}
