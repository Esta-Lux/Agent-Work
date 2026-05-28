export type LlmProviderId = "bootrise" | "openai";
export type ProviderId = LlmProviderId | "claude" | "codex";
export type ModelMode = "fast" | "deep" | "security" | "premium";
export type TaskRisk = "low" | "medium" | "high" | "critical";

export interface ProviderPolicy {
  provider: ProviderId;
  enabled: boolean;
  premium: boolean;
  requiresApproval: boolean;
  reason?: string;
}

export interface UsageEvent {
  id: string;
  orgId: string;
  userId: string;
  projectId: string;
  provider: ProviderId;
  model: string;
  mode: ModelMode;
  taskType: string;
  risk: TaskRisk;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  creditsCharged: number;
  premiumCreditsCharged: number;
  status: "estimated" | "allowed" | "blocked" | "succeeded" | "failed";
  failureReason: string | null;
  createdAt: string;
}

export interface QuotaPolicy {
  id: string;
  plan: "free" | "trial" | "internal" | "beta" | "pro" | "team" | "agency";
  monthlyCredits: number;
  monthlyPremiumCredits: number;
  maxAiCallsPerRun: number;
  maxPatchAttempts: number;
  maxFilesIndexed: number;
  maxFilesChanged: number;
  maxSandboxMinutes: number;
}

export interface QuotaDecision {
  allowed: boolean;
  reason: string | null;
  creditsRequired: number;
  premiumCreditsRequired: number;
  monthlyCreditsUsed: number;
  monthlyPremiumCreditsUsed: number;
  policy: QuotaPolicy;
}

export interface ModelRouteDecision {
  allowed: boolean;
  provider: LlmProviderId;
  requestedProvider: LlmProviderId;
  mode: ModelMode;
  risk: TaskRisk;
  taskType: string;
  modelLabel: string;
  premium: boolean;
  escalationReason: string | null;
  blockReason: string | null;
  quota: QuotaDecision;
  policy: ProviderPolicy;
}

export interface LlmHealthResult {
  provider: LlmProviderId;
  connected: boolean;
  model: string;
  message: string;
  latencyMs?: number;
}

export interface LlmChatResult {
  provider: LlmProviderId;
  model: string;
  text: string;
}

export function resolveUserProvider(selected?: string): LlmProviderId {
  if (selected === "openai") return "openai";
  return "bootrise";
}

export function resolveAdminProvider(selected?: string): LlmProviderId {
  const value = selected?.trim().toLowerCase();
  if (value === "openai" || value === "chatgpt" || value === "gpt") return "openai";
  return "bootrise";
}
