import { getKillSwitches } from "@/lib/admin/kill-switches";
import { getNvidiaModel } from "@/lib/ai/nvidia-client";
import { getOpenAIModel } from "@/lib/ai/openai-client";
import type {
  LlmProviderId,
  ModelMode,
  ModelRouteDecision,
  ProviderId,
  ProviderPolicy,
  TaskRisk
} from "@/lib/ai/providers";
import { resolveUserProvider } from "@/lib/ai/providers";
import { evaluateQuota, estimateCredits, resolveQuotaPolicy, type BillableTaskType } from "@/lib/usage/quota";
import { getCurrentMonthUsage, listUsageEvents, recordUsageEvent } from "@/lib/usage/usage-store";
import { assertCreditsAvailable, chargeCredits } from "@/lib/usage/credit-store";

export interface RouteModelInput {
  requestedProvider?: string | null;
  requestedMode?: string | null;
  taskType: BillableTaskType | string;
  requestText?: string;
  filePaths?: string[];
  fileCount?: number;
  changedFileCount?: number;
  contextChars?: number;
  failedAttempts?: number;
  aiCallsInRun?: number;
  sandboxMinutes?: number;
  premiumApproved?: boolean;
  orgId: string;
  userId: string;
  projectId: string;
  plan?: string | null;
}

export async function routeModel(input: RouteModelInput): Promise<ModelRouteDecision> {
  const requestedProvider = resolveUserProvider(input.requestedProvider ?? undefined);
  const requestedMode = normalizeMode(input.requestedMode, requestedProvider);
  const risk = assessTaskRisk(input);
  const premium = requestedProvider === "openai" || requestedMode === "premium";
  const provider = premium ? "openai" : "bootrise";
  const policy = resolveProviderPolicy(provider);
  const estimate = estimateCredits({
    taskType: input.taskType,
    mode: requestedMode,
    risk,
    fileCount: input.fileCount ?? input.filePaths?.length ?? 0,
    changedFileCount: input.changedFileCount,
    contextChars: input.contextChars,
    premium
  });
  const quotaPolicy = resolveQuotaPolicy(input.plan);
  const allUsage = await listUsageEvents({ orgId: input.orgId, userId: input.userId, limit: 1000 });
  const monthUsage = getCurrentMonthUsage(allUsage, input.orgId, input.userId);
  const quota = evaluateQuota({
    policy: quotaPolicy,
    usedEvents: monthUsage,
    creditsRequired: estimate.credits,
    premiumCreditsRequired: estimate.premiumCredits,
    aiCallsInRun: input.aiCallsInRun,
    fileCount: input.fileCount ?? input.filePaths?.length,
    changedFileCount: input.changedFileCount,
    sandboxMinutes: input.sandboxMinutes
  });

  const escalationReason = getEscalationReason(input, risk, premium);
  const blockReason =
    policy.enabled ? (!quota.allowed ? quota.reason : premium && !input.premiumApproved ? "Premium model usage requires explicit approval." : null) : policy.reason ?? "Provider is disabled.";

  return {
    allowed: !blockReason,
    provider,
    requestedProvider,
    mode: requestedMode,
    risk,
    taskType: input.taskType,
    modelLabel: provider === "openai" ? getOpenAIModel() : getNvidiaModel(),
    premium,
    escalationReason,
    blockReason,
    quota,
    policy
  };
}

export async function assertModelRouteAllowed(input: RouteModelInput): Promise<ModelRouteDecision> {
  await assertCreditsAvailable(input.orgId, String(input.taskType));
  const decision = await routeModel(input);
  if (!decision.allowed) {
    await recordModelUsage(decision, input, "blocked", decision.blockReason);
    throw new Error(decision.blockReason ?? "Model route blocked by BootRise policy.");
  }
  await recordModelUsage(decision, input, "allowed");
  return decision;
}

export async function recordModelUsage(
  decision: ModelRouteDecision,
  input: Pick<RouteModelInput, "orgId" | "userId" | "projectId">,
  status: "estimated" | "allowed" | "blocked" | "succeeded" | "failed",
  failureReason?: string | null
) {
  const estimate = estimateCredits({
    taskType: decision.taskType,
    mode: decision.mode,
    risk: decision.risk,
    premium: decision.premium
  });
  if (status === "succeeded") {
    void chargeCredits({ orgId: input.orgId, userId: input.userId, action: String(decision.taskType) });
  }
  return recordUsageEvent({
    orgId: input.orgId,
    userId: input.userId,
    projectId: input.projectId,
    provider: decision.provider,
    model: decision.modelLabel,
    mode: decision.mode,
    taskType: decision.taskType,
    risk: decision.risk,
    estimatedInputTokens: estimate.inputTokens,
    estimatedOutputTokens: estimate.outputTokens,
    estimatedCostUsd: estimate.costUsd,
    creditsCharged: status === "succeeded" || status === "failed" ? decision.quota.creditsRequired : 0,
    premiumCreditsCharged:
      status === "succeeded" || status === "failed" ? decision.quota.premiumCreditsRequired : 0,
    status,
    failureReason
  });
}

export function getProviderPolicies(): ProviderPolicy[] {
  return (["bootrise", "openai", "claude", "codex"] as ProviderId[]).map(resolveProviderPolicy);
}

export function assessTaskRisk(input: {
  requestText?: string;
  filePaths?: string[];
  fileCount?: number;
  changedFileCount?: number;
  failedAttempts?: number;
  taskType?: string;
}): TaskRisk {
  const text = [input.requestText ?? "", ...(input.filePaths ?? [])].join(" ").toLowerCase();
  const sensitive = /\b(auth|login|session|jwt|oauth|sso|permission|role|billing|payment|stripe|invoice|subscription|migration|schema|sql|secret|env|deploy|production|security|rls)\b/i.test(
    text
  );
  if (sensitive && (input.changedFileCount ?? 0) > 8) return "critical";
  if (sensitive) return "high";
  if ((input.failedAttempts ?? 0) >= 2) return "high";
  if ((input.fileCount ?? 0) > 5000 || (input.changedFileCount ?? 0) > 15) return "high";
  if ((input.fileCount ?? 0) > 1000 || (input.changedFileCount ?? 0) > 5) return "medium";
  if (input.taskType === "sandbox" || input.taskType === "draft_pr") return "medium";
  return "low";
}

function normalizeMode(mode: string | null | undefined, provider: LlmProviderId): ModelMode {
  if (provider === "openai") return "premium";
  if (mode === "fast" || mode === "deep" || mode === "security" || mode === "premium") return mode;
  return "fast";
}

function resolveProviderPolicy(provider: ProviderId): ProviderPolicy {
  const switches = getKillSwitches();
  if (provider === "bootrise") {
    return {
      provider,
      enabled: !switches.disableNvidia && !switches.disableExpensiveModels,
      premium: false,
      requiresApproval: false,
      reason: switches.disableNvidia ? "BootRise AI / NVIDIA is disabled by admin kill switch." : undefined
    };
  }
  if (provider === "openai") {
    return {
      provider,
      enabled: !switches.disableOpenAI && !switches.disablePremiumEscalation && !switches.disableExpensiveModels,
      premium: true,
      requiresApproval: true,
      reason: switches.disableOpenAI ? "OpenAI is disabled by admin kill switch." : undefined
    };
  }
  if (provider === "claude") {
    return {
      provider,
      enabled: !switches.disableClaude && !switches.disablePremiumEscalation && false,
      premium: true,
      requiresApproval: true,
      reason: "Claude adapter is planned but not implemented yet."
    };
  }
  return {
    provider,
    enabled: !switches.disableCodex && !switches.disablePremiumEscalation && false,
    premium: true,
    requiresApproval: true,
    reason: "Codex adapter is planned but not implemented yet."
  };
}

function getEscalationReason(input: RouteModelInput, risk: TaskRisk, premium: boolean): string | null {
  if (!premium) return null;
  if (input.requestedProvider === "openai" || input.requestedMode === "premium") return "User selected premium model mode.";
  if (risk === "critical" || risk === "high") return "High-risk task qualifies for premium reasoning.";
  if ((input.failedAttempts ?? 0) > 0) return "Prior model attempt failed.";
  return "Premium escalation requested.";
}
