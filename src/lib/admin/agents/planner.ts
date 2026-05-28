import type { AuthUser } from "@/lib/auth/types";
import type { LlmProviderId } from "@/lib/ai/providers";
import { runToolLoop, type ProviderChatFn } from "@/lib/admin/agent-tool-loop";
import type { CodebaseMemorySnapshot } from "@/lib/admin/codebase-memory";
import { loadSelfRepoSnapshot } from "@/lib/admin/self-repo";
import { buildRepoIntelligenceSnapshot } from "@/lib/intelligence/repo-intelligence";
import { createInitialChangePlan } from "@/lib/planning/planner";
import type { ChangePlan } from "@/lib/types/core";
import { completeAgentRun, createAgentRun, recordEvent, type AgentRun } from "@/lib/admin/agents/types";
import { summarizeForPrompt } from "@/lib/admin/codebase-memory";

const PLANNER_SYSTEM = [
  "You are the Planner agent for the BootRise admin self-agent.",
  "Use the available tools (list-routes, grep-symbol, find-callers, query-memory, list-symbols, dep-graph) to ground the plan in the real codebase.",
  "Final answer must be a fenced JSON block with shape:",
  '{"interpretedGoal":"...","businessImpact":"...","impactedFiles":["..."],"steps":[{"title":"...","summary":"...","targetFiles":["..."]}],"rollbackStrategy":"..."}',
  "Be concise. Do not include secrets or absolute paths."
].join("\n");

export interface PlannerInput {
  user: AuthUser;
  orgId: string;
  request: string;
  memory: CodebaseMemorySnapshot;
  provider: LlmProviderId;
  providerChat?: ProviderChatFn;
}

export interface PlannerOutput {
  plan: ChangePlan;
  run: AgentRun;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mergePlanWithModelJson(scaffold: ChangePlan, model: Record<string, unknown> | null): ChangePlan {
  if (!model) return scaffold;
  const goal = typeof model.interpretedGoal === "string" ? model.interpretedGoal : scaffold.intent.interpretedGoal;
  const impact = typeof model.businessImpact === "string" ? model.businessImpact : scaffold.intent.businessImpact;
  const impactedFiles = Array.isArray(model.impactedFiles)
    ? (model.impactedFiles as unknown[]).filter((p): p is string => typeof p === "string")
    : scaffold.impact.files;
  const rollback = typeof model.rollbackStrategy === "string" ? model.rollbackStrategy : scaffold.rollbackStrategy;
  const stepsRaw = Array.isArray(model.steps) ? (model.steps as Array<Record<string, unknown>>) : [];
  const steps = stepsRaw.length
    ? stepsRaw.map((entry, i) => ({
        id: `step_${i + 1}`,
        title: typeof entry.title === "string" ? entry.title : `Step ${i + 1}`,
        domain: scaffold.steps[i]?.domain ?? "backend",
        summary: typeof entry.summary === "string" ? entry.summary : "",
        targetFiles: Array.isArray(entry.targetFiles)
          ? (entry.targetFiles as unknown[]).filter((p): p is string => typeof p === "string")
          : [],
        dependsOn: scaffold.steps[i]?.dependsOn ?? []
      }))
    : scaffold.steps;
  return {
    ...scaffold,
    intent: { ...scaffold.intent, interpretedGoal: goal, businessImpact: impact },
    impact: { ...scaffold.impact, files: impactedFiles },
    steps,
    rollbackStrategy: rollback
  };
}

export async function runPlannerAgent(input: PlannerInput): Promise<PlannerOutput> {
  const run = createAgentRun("planner");
  try {
    const files = loadSelfRepoSnapshot();
    const repo = buildRepoIntelligenceSnapshot(files);
    const scaffold = createInitialChangePlan(input.request, repo);
    const userMsg = [
      `Request: ${input.request}`,
      "",
      "Scaffold plan (use as starting point):",
      JSON.stringify({ impactedFiles: scaffold.impact.files, steps: scaffold.steps.map((s) => s.title) }),
      "",
      summarizeForPrompt(input.memory)
    ].join("\n");

    const loop = await runToolLoop({
      user: input.user,
      orgId: input.orgId,
      provider: input.provider,
      systemPrompt: PLANNER_SYSTEM,
      userMessage: userMsg,
      maxSteps: 6,
      memory: input.memory,
      providerChat: input.providerChat,
      onEvent: (event) => recordEvent(run, event)
    });

    const merged = mergePlanWithModelJson(scaffold, extractJsonObject(loop.finalMessage));
    completeAgentRun(run);
    return { plan: merged, run };
  } catch (error) {
    completeAgentRun(run, error instanceof Error ? error : String(error));
    throw error;
  }
}
