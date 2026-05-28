import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { AuthUser } from "@/lib/auth/types";
import type { LlmProviderId } from "@/lib/ai/providers";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import { recordAudit } from "@/lib/admin/audit-log";
import { loadCodebaseMemory, type CodebaseMemorySnapshot } from "@/lib/admin/codebase-memory";
import { loadSelfRepoSnapshot, SELF_REPOSITORY_ID } from "@/lib/admin/self-repo";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ChangePlan } from "@/lib/types/core";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import { runPlannerAgent } from "@/lib/admin/agents/planner";
import { runCoderAgent } from "@/lib/admin/agents/coder";
import { runReviewerAgent } from "@/lib/admin/agents/reviewer";
import type { AgentRun, ReviewResult } from "@/lib/admin/agents/types";
import type { ProviderChatFn } from "@/lib/admin/agent-tool-loop";
import type { ToolLoopEvent } from "@/lib/admin/agent-tool-loop";

const RUN_LOG_FILENAME = "agent-runs.jsonl";

export interface AgentGraphInput {
  user: AuthUser;
  orgId: string;
  request: string;
  provider: LlmProviderId;
  pendingFixId?: string;
  memory?: CodebaseMemorySnapshot;
  files?: SourceFileInput[];
  providerChat?: ProviderChatFn;
  onEvent?: (event: ToolLoopEvent & { agent: AgentRun["agent"] }) => void;
}

export interface AgentGraphResult {
  plan: ChangePlan;
  patches: ProposedPatch[];
  review: ReviewResult;
  runs: AgentRun[];
  memory: CodebaseMemorySnapshot;
  files: SourceFileInput[];
}

function runLogPath(): string {
  return resolve(process.cwd(), ".bootrise", "admin", RUN_LOG_FILENAME);
}

function ensureRunLog(): void {
  mkdirSync(join(runLogPath(), ".."), { recursive: true });
}

function persistRun(run: AgentRun, pendingFixId?: string): void {
  ensureRunLog();
  const enriched: AgentRun = { ...run, pendingFixId: pendingFixId ?? run.pendingFixId };
  appendFileSync(runLogPath(), `${JSON.stringify(enriched)}\n`, "utf8");
}

export function listAgentRuns(opts?: { pendingFixId?: string; limit?: number }): AgentRun[] {
  const path = runLogPath();
  if (!existsSync(path)) return [];
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  const rows: AgentRun[] = [];
  for (const line of raw.split("\n").filter(Boolean).reverse()) {
    try {
      const entry = JSON.parse(line) as AgentRun;
      if (opts?.pendingFixId && entry.pendingFixId !== opts.pendingFixId) continue;
      rows.push(entry);
      if (opts?.limit && rows.length >= opts.limit) break;
    } catch {
      continue;
    }
  }
  return rows;
}

export async function runAgentGraph(input: AgentGraphInput): Promise<AgentGraphResult> {
  assertKillSwitchAllowed("admin_agent");
  assertKillSwitchAllowed("advanced_admin_agent");

  const memory = input.memory ?? (await loadCodebaseMemory());
  const files = input.files ?? loadSelfRepoSnapshot();
  const runs: AgentRun[] = [];

  try {
    const plannerOut = await runPlannerAgent({
      user: input.user,
      orgId: input.orgId,
      request: input.request,
      memory,
      provider: input.provider,
      providerChat: input.providerChat
    });
    persistRun(plannerOut.run, input.pendingFixId);
    runs.push(plannerOut.run);

    const coderOut = await runCoderAgent({
      user: input.user,
      orgId: input.orgId,
      plan: plannerOut.plan,
      files,
      provider: input.provider,
      memory,
      request: input.request,
      projectId: SELF_REPOSITORY_ID,
      repositoryId: SELF_REPOSITORY_ID,
      providerChat: input.providerChat
    });
    persistRun(coderOut.run, input.pendingFixId);
    runs.push(coderOut.run);

    const reviewerOut = await runReviewerAgent({
      user: input.user,
      orgId: input.orgId,
      plan: plannerOut.plan,
      patches: coderOut.patches,
      memory,
      provider: input.provider,
      providerChat: input.providerChat
    });
    persistRun(reviewerOut.run, input.pendingFixId);
    runs.push(reviewerOut.run);

    void recordAudit(
      {
        actor: input.user.id,
        action: "admin_agent.agent_graph_run",
        detail: input.request.slice(0, 120),
        metadata: {
          patches: coderOut.patches.length,
          verdict: reviewerOut.verdict,
          source: coderOut.source
        }
      },
      input.orgId
    );

    return {
      plan: plannerOut.plan,
      patches: coderOut.patches,
      review: { verdict: reviewerOut.verdict, findings: reviewerOut.findings },
      runs,
      memory,
      files
    };
  } catch (error) {
    void recordAudit(
      {
        actor: input.user.id,
        action: "admin_agent.agent_graph_failed",
        detail: input.request.slice(0, 120),
        metadata: { reason: error instanceof Error ? error.message : String(error) }
      },
      input.orgId
    );
    throw error;
  }
}
