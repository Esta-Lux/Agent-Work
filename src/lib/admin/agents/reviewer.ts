import type { AuthUser } from "@/lib/auth/types";
import type { LlmProviderId } from "@/lib/ai/providers";
import { runToolLoop, type ProviderChatFn } from "@/lib/admin/agent-tool-loop";
import type { CodebaseMemorySnapshot } from "@/lib/admin/codebase-memory";
import type { ChangePlan } from "@/lib/types/core";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import {
  completeAgentRun,
  createAgentRun,
  recordEvent,
  type AgentRun,
  type ReviewFinding,
  type ReviewResult
} from "@/lib/admin/agents/types";

const REVIEWER_SYSTEM = [
  "You are the Reviewer agent for the BootRise admin self-agent.",
  "Use read-file / find-callers / dep-graph to validate the patches against the plan.",
  "Return a fenced JSON block with shape:",
  '{"verdict":"approve|reject|needs_changes","findings":[{"severity":"info|warning|critical","message":"...","path":"optional"}]}',
  "Default verdict on uncertainty: needs_changes."
].join("\n");

export interface ReviewerInput {
  user: AuthUser;
  orgId: string;
  plan: ChangePlan;
  patches: ProposedPatch[];
  memory: CodebaseMemorySnapshot;
  provider: LlmProviderId;
  providerChat?: ProviderChatFn;
}

export interface ReviewerOutput extends ReviewResult {
  run: AgentRun;
}

function parseReview(text: string): ReviewResult {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return { verdict: "needs_changes", findings: [{ severity: "warning", message: "Reviewer JSON not parseable; default verdict applied." }] };
  }
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
    const verdictRaw = typeof parsed.verdict === "string" ? parsed.verdict : "needs_changes";
    const verdict: ReviewResult["verdict"] =
      verdictRaw === "approve" || verdictRaw === "reject" || verdictRaw === "needs_changes"
        ? verdictRaw
        : "needs_changes";
    const findingsRaw = Array.isArray(parsed.findings) ? (parsed.findings as Array<Record<string, unknown>>) : [];
    const findings: ReviewFinding[] = findingsRaw
      .filter((entry) => typeof entry.message === "string")
      .map((entry) => ({
        severity:
          entry.severity === "info" || entry.severity === "warning" || entry.severity === "critical"
            ? entry.severity
            : "info",
        message: String(entry.message),
        path: typeof entry.path === "string" ? entry.path : undefined
      }));
    return { verdict, findings };
  } catch {
    return { verdict: "needs_changes", findings: [{ severity: "warning", message: "Reviewer JSON parse error." }] };
  }
}

export async function runReviewerAgent(input: ReviewerInput): Promise<ReviewerOutput> {
  const run = createAgentRun("reviewer");
  try {
    const userMsg = [
      `Plan goal: ${input.plan.intent.interpretedGoal}`,
      `Patches (${input.patches.length}):`,
      ...input.patches.slice(0, 8).map((p) => `- ${p.path}: ${p.summary}`)
    ].join("\n");

    const loop = await runToolLoop({
      user: input.user,
      orgId: input.orgId,
      provider: input.provider,
      systemPrompt: REVIEWER_SYSTEM,
      userMessage: userMsg,
      maxSteps: 6,
      memory: input.memory,
      providerChat: input.providerChat,
      onEvent: (event) => recordEvent(run, event)
    });

    const review = parseReview(loop.finalMessage);
    completeAgentRun(run);
    return { ...review, run };
  } catch (error) {
    completeAgentRun(run, error instanceof Error ? error : String(error));
    throw error;
  }
}
