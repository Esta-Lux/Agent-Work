import type { AuthUser } from "@/lib/auth/types";
import type { LlmProviderId } from "@/lib/ai/providers";
import { resolveAdminProvider } from "@/lib/ai/providers";
import {
  assertModelRouteAllowed,
  recordModelUsage
} from "@/lib/ai/model-router";
import {
  createProviderChatResponse,
  createProviderChangePlan,
  isProviderConfigured
} from "@/lib/ai/llm-router";
import { buildSeniorArchitectBrief, buildEfficientModelContext } from "@/lib/ai/senior-architect";
import { classifyTaskIntent } from "@/lib/ai/task-intent";
import { recordAudit } from "@/lib/admin/audit-log";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import {
  SELF_REPOSITORY_ID,
  getSelfRepoDefaultBranch,
  getSelfRepoRemoteUrl,
  loadSelfRepoSnapshot,
  syncSelfRepoSnapshot
} from "@/lib/admin/self-repo";
import { runChatControlGate, selectChatContextFiles } from "@/lib/control/chat-control";
import { buildRepoIntelligenceSnapshot, type SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { createInitialChangePlan } from "@/lib/planning/planner";
import { DEFAULT_ORG_ID } from "@/lib/tenancy/org-context";
import type { ChangePlan } from "@/lib/types/core";
import { createDiffPreviewFromPatches } from "@/lib/workspace/diff-from-patches";
import { createDraftPullRequest, buildPullRequestBody } from "@/lib/workspace/github-pr";
import { pushFilesDirectlyToBranch } from "@/lib/workspace/github-direct-push";
import { pushFilesToGithub } from "@/lib/workspace/github-push";
import { getPendingFix } from "@/lib/workspace/pending-fix-store";
import {
  approvePendingFix,
  createPendingFixPlan,
  persistAdminPendingFix,
  rejectPendingFix
} from "@/lib/workspace/workspace-fix.server";
import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";
import { getKillSwitches } from "@/lib/admin/kill-switches";
import { runAgentGraph } from "@/lib/admin/agent-graph";
import { startWatchdogOnBoot } from "@/lib/admin/detections/watchdog";

if (typeof window === "undefined" && !process.execArgv.some((a) => a.includes("--test")) && !process.argv.some((a) => a.includes("--test"))) {
  startWatchdogOnBoot();
}

const ADMIN_PROJECT_ID = SELF_REPOSITORY_ID;

interface AdminUserCtx {
  user: AuthUser;
  orgId?: string;
}

export interface AdminAgentChatInput extends AdminUserCtx {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  provider?: string;
  mode?: string;
}

export interface AdminAgentChatResult {
  reply: string;
  provider: LlmProviderId;
  model: string;
  filesConsidered: number;
  contextSummary: string;
  stopReason: string | null;
}

export interface AdminAgentPlanInput extends AdminUserCtx {
  request: string;
  provider?: string;
}

export interface AdminAgentPlanResult {
  plan: ChangePlan;
  provider: LlmProviderId;
  model: string;
  fileCount: number;
}

export interface AdminAgentFixInput extends AdminUserCtx {
  request: string;
  provider?: string;
  assumptionsApproved?: boolean;
  streamId?: string;
}

export interface AdminAgentFixResult {
  pendingFixId: string;
  report: WorkspaceFixReport;
  filesConsidered: number;
}

export interface AdminAgentApproveResult {
  applied: number;
  previewUrl: string;
  report: WorkspaceFixReport;
}

export interface AdminAgentPushInput extends AdminUserCtx {
  pendingFixId: string;
  remoteUrl?: string;
  branch?: string;
  commitMessage?: string;
  confirmPushToMain?: boolean;
  confirmationPhrase?: string;
}

export interface AdminAgentPushResult {
  mode: "draft_pr" | "direct";
  branch: string;
  url: string;
  commitSha?: string;
  pushed: string[];
  unpushed: string[];
}

function resolveOrg(input: AdminUserCtx): string {
  return input.orgId ?? DEFAULT_ORG_ID;
}

function audit(user: AuthUser, action: string, detail: string, metadata: Record<string, string | number | boolean> = {}, orgId?: string): void {
  void recordAudit({ actor: user.id, action: `admin_agent.${action}`, detail, metadata }, orgId);
}

export async function runAdminAgentChat(input: AdminAgentChatInput): Promise<AdminAgentChatResult> {
  assertKillSwitchAllowed("admin_agent");
  const provider = resolveAdminProvider(input.provider);
  if (!isProviderConfigured(provider)) {
    return deterministicChat(input, provider);
  }
  const orgId = resolveOrg(input);
  const decision = await assertModelRouteAllowed({
    taskType: "admin_agent_chat",
    requestText: input.message,
    requestedProvider: provider,
    requestedMode: input.mode ?? "fast",
    orgId,
    userId: input.user.id,
    projectId: ADMIN_PROJECT_ID,
    premiumApproved: true
  });
  syncSelfRepoSnapshot();
  const files = loadSelfRepoSnapshot();
  const chat = await runChatControlGate({
    request: input.message,
    files,
    orgId,
    projectId: ADMIN_PROJECT_ID,
    repositoryId: SELF_REPOSITORY_ID,
    mode: input.mode
  });

  const taskIntent = classifyTaskIntent(input.message, { mode: input.mode });
  const efficient = buildEfficientModelContext(files, chat.contextPlan, taskIntent.depth);
  const selected = selectChatContextFiles(files, chat.contextPlan);
  const brief = buildSeniorArchitectBrief({
    request: input.message,
    taskIntent,
    productName: "BootRise",
    scopeLockMessage: "Edits target the BootRise codebase itself (admin self-agent)."
  });

  const contextBlock = efficient.block ||
    selected.slice(0, 24).map((f) => `### ${f.path}\n\`\`\`\n${f.content.slice(0, 2000)}\n\`\`\``).join("\n\n");
  const system = `${brief}\n\nBootRise self-repo context (${efficient.filesIncluded || selected.length} files):\n${contextBlock}`;

  let result;
  try {
    result = await createProviderChatResponse({
      provider,
      message: input.message,
      history: input.history ?? [],
      system
    });
  } catch (error) {
    await recordModelUsage(decision, { orgId, userId: input.user.id, projectId: ADMIN_PROJECT_ID }, "failed", error instanceof Error ? error.message : String(error));
    audit(input.user, "chat_failed", input.message.slice(0, 120), { provider }, orgId);
    throw error;
  }
  await recordModelUsage(decision, { orgId, userId: input.user.id, projectId: ADMIN_PROJECT_ID }, "succeeded");
  audit(input.user, "chat", input.message.slice(0, 120), { provider, model: result.model, files: files.length }, orgId);

  return {
    reply: result.text,
    provider: result.provider,
    model: result.model,
    filesConsidered: files.length,
    contextSummary: chat.contextPlan.summary,
    stopReason: chat.stopReason
  };
}

function deterministicChat(input: AdminAgentChatInput, provider: LlmProviderId): AdminAgentChatResult {
  const orgId = resolveOrg(input);
  audit(input.user, "chat_offline", input.message.slice(0, 120), { provider }, orgId);
  return {
    reply: `Admin self-agent is online but no ${provider === "openai" ? "OpenAI" : "BootRise/NVIDIA"} key is configured. Set the provider key in .env.local to enable codebase-aware replies. Question received: "${input.message.slice(0, 200)}"`,
    provider,
    model: "deterministic",
    filesConsidered: 0,
    contextSummary: "Offline fallback — no LLM call made.",
    stopReason: "provider_not_configured"
  };
}

export async function runAdminAgentPlan(input: AdminAgentPlanInput): Promise<AdminAgentPlanResult> {
  assertKillSwitchAllowed("admin_agent");
  const provider = resolveAdminProvider(input.provider);
  const orgId = resolveOrg(input);
  const decision = await assertModelRouteAllowed({
    taskType: "admin_agent_plan",
    requestText: input.request,
    requestedProvider: provider,
    orgId,
    userId: input.user.id,
    projectId: ADMIN_PROJECT_ID,
    premiumApproved: true
  });
  syncSelfRepoSnapshot();
  const files = loadSelfRepoSnapshot();
  const repo = buildRepoIntelligenceSnapshot(files);
  const scaffold = createInitialChangePlan(input.request, repo);
  if (!isProviderConfigured(provider)) {
    audit(input.user, "plan_offline", input.request.slice(0, 120), { files: files.length }, orgId);
    return { plan: scaffold, provider, model: "deterministic", fileCount: files.length };
  }
  try {
    const ai = await createProviderChangePlan(provider, input.request, repo, scaffold);
    await recordModelUsage(decision, { orgId, userId: input.user.id, projectId: ADMIN_PROJECT_ID }, "succeeded");
    audit(input.user, "plan", input.request.slice(0, 120), { provider: ai.provider, model: ai.model, files: files.length }, orgId);
    return { plan: ai.plan, provider: ai.provider, model: ai.model, fileCount: files.length };
  } catch (error) {
    await recordModelUsage(decision, { orgId, userId: input.user.id, projectId: ADMIN_PROJECT_ID }, "failed", error instanceof Error ? error.message : String(error));
    audit(input.user, "plan_failed", input.request.slice(0, 120), { provider }, orgId);
    throw error;
  }
}

export async function runAdminAgentFix(input: AdminAgentFixInput): Promise<AdminAgentFixResult> {
  assertKillSwitchAllowed("admin_agent");
  assertKillSwitchAllowed("fix");
  const provider = resolveAdminProvider(input.provider);
  const orgId = resolveOrg(input);
  await assertModelRouteAllowed({
    taskType: "admin_agent_fix",
    requestText: input.request,
    requestedProvider: provider,
    orgId,
    userId: input.user.id,
    projectId: ADMIN_PROJECT_ID,
    premiumApproved: true
  });
  syncSelfRepoSnapshot();
  const files = loadSelfRepoSnapshot();

  let pendingFixId: string;
  let report: WorkspaceFixReport;
  let usedGraph = false;

  if (!getKillSwitches().disableAdvancedAdminAgent) {
    try {
      const graph = await runAgentGraph({
        user: input.user,
        orgId,
        request: input.request,
        provider,
        files,
        streamId: input.streamId
      });
      const persisted = await persistAdminPendingFix({
        files,
        request: input.request,
        provider,
        orgId,
        userId: input.user.id,
        projectId: ADMIN_PROJECT_ID,
        prebuiltPlan: graph.plan,
        prebuiltPatches: graph.patches,
        review: graph.review,
        assumptionsApproved: input.assumptionsApproved
      });
      pendingFixId = persisted.pendingFixId;
      report = persisted.report;
      usedGraph = true;
    } catch (error) {
      audit(input.user, "agent_graph_failed", input.request.slice(0, 120), {
        reason: error instanceof Error ? error.message : String(error)
      }, orgId);
      const fallback = await createPendingFixPlan(files, input.request, provider, {
        orgId,
        userId: input.user.id,
        projectId: ADMIN_PROJECT_ID,
        assumptionsApproved: input.assumptionsApproved
      });
      pendingFixId = fallback.pendingFixId;
      report = fallback.report;
    }
  } else {
    const result = await createPendingFixPlan(files, input.request, provider, {
      orgId,
      userId: input.user.id,
      projectId: ADMIN_PROJECT_ID,
      assumptionsApproved: input.assumptionsApproved
    });
    pendingFixId = result.pendingFixId;
    report = result.report;
  }

  audit(input.user, "fix", input.request.slice(0, 120), {
    provider,
    pendingFixId,
    patches: report.patches?.length ?? 0,
    files: files.length,
    graph: usedGraph
  }, orgId);
  return {
    pendingFixId,
    report,
    filesConsidered: files.length
  };
}

export async function runAdminAgentApprove(input: { pendingFixId: string; user: AuthUser; orgId?: string }): Promise<AdminAgentApproveResult> {
  assertKillSwitchAllowed("admin_agent");
  const orgId = resolveOrg(input);
  const result = await approvePendingFix(input.pendingFixId, { orgId });
  audit(input.user, "approve", input.pendingFixId, { applied: result.files.length, previewUrl: result.previewUrl }, orgId);
  return { applied: result.files.length, previewUrl: result.previewUrl, report: result.report };
}

export async function runAdminAgentReject(input: { pendingFixId: string; reason?: string; user: AuthUser; orgId?: string }): Promise<{ ok: true }> {
  assertKillSwitchAllowed("admin_agent");
  const orgId = resolveOrg(input);
  await rejectPendingFix(input.pendingFixId, orgId);
  audit(input.user, "reject", input.pendingFixId, { reason: input.reason ?? "" }, orgId);
  return { ok: true };
}

export async function runAdminAgentPush(input: AdminAgentPushInput): Promise<AdminAgentPushResult> {
  assertKillSwitchAllowed("admin_agent");
  assertKillSwitchAllowed("github_push");
  const orgId = resolveOrg(input);
  const pending = await getPendingFix(input.pendingFixId, orgId);
  if (!pending) throw new Error("Pending fix not found.");
  if (pending.status !== "approved") throw new Error("Approve the plan before pushing.");

  const remoteUrl = input.remoteUrl?.trim() || getSelfRepoRemoteUrl();
  if (!remoteUrl) throw new Error("Self-repo remote URL is not configured. Set BOOTRISE_SELF_REPO_REMOTE_URL or pass remoteUrl.");
  const branch = (input.branch?.trim() || getSelfRepoDefaultBranch()).replace(/^refs\/heads\//, "");
  const commitMessage = input.commitMessage?.trim() || `bootrise(admin-agent): ${pending.request.slice(0, 72)}`;

  const appliedFiles: SourceFileInput[] = pending.filesSnapshot.map((file) => {
    const patch = pending.patches.find((p) => p.path === file.path);
    return patch ? { path: file.path, content: patch.after } : file;
  });
  for (const patch of pending.patches) {
    if (!appliedFiles.some((f) => f.path === patch.path)) {
      appliedFiles.push({ path: patch.path, content: patch.after });
    }
  }
  const onlyPaths = pending.patches.map((p) => p.path);

  if (input.confirmPushToMain === true) {
    if (input.confirmationPhrase !== "PUSH TO MAIN") {
      throw new Error("Direct push to main requires confirmationPhrase === \"PUSH TO MAIN\".");
    }
    const direct = await pushFilesDirectlyToBranch({
      remoteUrl,
      branch,
      files: appliedFiles,
      onlyPaths,
      commitMessage,
      confirmDirectPushToMain: true
    });
    audit(input.user, "push_direct", input.pendingFixId, {
      branch: direct.branch,
      commitSha: direct.commitSha,
      pushed: direct.pushed.length
    }, orgId);
    return {
      mode: "direct",
      branch: direct.branch,
      url: `https://github.com/${ownerRepoPath(remoteUrl)}/commit/${direct.commitSha}`,
      commitSha: direct.commitSha,
      pushed: direct.pushed,
      unpushed: direct.unpushed
    };
  }

  assertKillSwitchAllowed("draft_pr");
  const push = await pushFilesToGithub({
    remoteUrl,
    baseBranch: branch,
    files: appliedFiles,
    onlyPaths,
    commitMessage
  });
  const body = buildAdminAgentPullRequestBody(pending.request, pending.plan, pending.patches.map((p) => p.path));
  const pr = await createDraftPullRequest({
    remoteUrl,
    headBranch: push.branch,
    baseBranch: branch,
    title: commitMessage,
    body,
    draft: true
  });
  audit(input.user, "push_pr", input.pendingFixId, {
    branch: push.branch,
    prNumber: pr.prNumber,
    prUrl: pr.prUrl,
    pushed: push.pushed.length
  }, orgId);
  return {
    mode: "draft_pr",
    branch: push.branch,
    url: pr.prUrl,
    pushed: push.pushed,
    unpushed: push.skipped
  };
}

function ownerRepoPath(remoteUrl: string): string {
  const cleaned = remoteUrl.replace(/^git@github\.com:/, "https://github.com/").replace(/\.git$/, "");
  const m = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)/);
  return m ? `${m[1]}/${m[2]}` : "repo";
}

function buildAdminAgentPullRequestBody(request: string, plan: ChangePlan, changedPaths: string[]): string {
  const lines = [
    "## BootRise admin self-agent",
    "",
    `**Request:** ${request}`,
    "",
    `**Goal:** ${plan.intent.interpretedGoal}`,
    "",
    `**Risk:** ${plan.risk.level} — ${plan.risk.reasons.slice(0, 4).join("; ")}`,
    "",
    `**Files touched (${changedPaths.length}):**`,
    ...changedPaths.slice(0, 30).map((p) => `- ${p}`),
    changedPaths.length > 30 ? `…and ${changedPaths.length - 30} more` : "",
    "",
    `**Rollback:** ${plan.rollbackStrategy || "Revert the merge commit."}`
  ];
  return lines.filter(Boolean).join("\n");
}

// expose context summary type-helpers if needed elsewhere
export { SELF_REPOSITORY_ID };
// suppress unused import lint: createDiffPreviewFromPatches and buildPullRequestBody intentionally kept available for future use
void createDiffPreviewFromPatches;
void buildPullRequestBody;

