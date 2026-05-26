import type { ModelMode, QuotaDecision, QuotaPolicy, TaskRisk } from "@/lib/ai/providers";
import type { UsageEventRecord } from "@/lib/persistence/schema";

export type BillableTaskType =
  | "fix"
  | "chat"
  | "code_review"
  | "admin_chat"
  | "sandbox"
  | "draft_pr"
  | "github_import"
  | "usage_estimate";

export const quotaPolicies: QuotaPolicy[] = [
  {
    id: "quota_free",
    plan: "free",
    monthlyCredits: 100,
    monthlyPremiumCredits: 0,
    maxAiCallsPerRun: 2,
    maxPatchAttempts: 0,
    maxFilesIndexed: 150,
    maxFilesChanged: 0,
    maxSandboxMinutes: 0
  },
  {
    id: "quota_trial",
    plan: "trial",
    monthlyCredits: 500,
    monthlyPremiumCredits: 0,
    maxAiCallsPerRun: 3,
    maxPatchAttempts: 1,
    maxFilesIndexed: 500,
    maxFilesChanged: 2,
    maxSandboxMinutes: 0
  },
  {
    id: "quota_internal",
    plan: "internal",
    monthlyCredits: 50_000,
    monthlyPremiumCredits: 15_000,
    maxAiCallsPerRun: 20,
    maxPatchAttempts: 8,
    maxFilesIndexed: 20_000,
    maxFilesChanged: 25,
    maxSandboxMinutes: 60
  },
  {
    id: "quota_beta",
    plan: "beta",
    monthlyCredits: 2_000,
    monthlyPremiumCredits: 400,
    maxAiCallsPerRun: 6,
    maxPatchAttempts: 3,
    maxFilesIndexed: 2_500,
    maxFilesChanged: 8,
    maxSandboxMinutes: 10
  },
  {
    id: "quota_pro",
    plan: "pro",
    monthlyCredits: 5_000,
    monthlyPremiumCredits: 1_000,
    maxAiCallsPerRun: 8,
    maxPatchAttempts: 5,
    maxFilesIndexed: 5_000,
    maxFilesChanged: 12,
    maxSandboxMinutes: 20
  },
  {
    id: "quota_team",
    plan: "team",
    monthlyCredits: 15_000,
    monthlyPremiumCredits: 4_000,
    maxAiCallsPerRun: 12,
    maxPatchAttempts: 6,
    maxFilesIndexed: 10_000,
    maxFilesChanged: 20,
    maxSandboxMinutes: 45
  },
  {
    id: "quota_agency",
    plan: "agency",
    monthlyCredits: 40_000,
    monthlyPremiumCredits: 12_000,
    maxAiCallsPerRun: 16,
    maxPatchAttempts: 8,
    maxFilesIndexed: 25_000,
    maxFilesChanged: 30,
    maxSandboxMinutes: 90
  }
];

export function resolveQuotaPolicy(plan?: string | null): QuotaPolicy {
  const selected = quotaPolicies.find((policy) => policy.plan === plan);
  if (selected) return selected;
  const fallbackPlan = process.env.BOOTRISE_DEFAULT_PLAN?.trim() || "internal";
  return quotaPolicies.find((policy) => policy.plan === fallbackPlan) ?? quotaPolicies[2];
}

export function estimateCredits(input: {
  taskType: BillableTaskType | string;
  mode: ModelMode;
  risk: TaskRisk;
  fileCount?: number;
  changedFileCount?: number;
  contextChars?: number;
  premium?: boolean;
}): { credits: number; premiumCredits: number; inputTokens: number; outputTokens: number; costUsd: number } {
  const fileCount = input.fileCount ?? 0;
  const changedFileCount = input.changedFileCount ?? 0;
  const inputTokens = Math.ceil((input.contextChars ?? fileCount * 900 + changedFileCount * 1800 + 1600) / 4);
  const outputTokens = input.mode === "premium" ? 3000 : input.mode === "deep" || input.mode === "security" ? 1800 : 900;

  let base = 5;
  if (input.taskType === "fix") base = 60;
  if (input.taskType === "code_review") base = 40;
  if (input.taskType === "admin_chat") base = 8;
  if (input.taskType === "sandbox") base = 100;
  if (input.taskType === "draft_pr") base = 50;
  if (input.taskType === "github_import") base = 25;
  if (input.taskType === "usage_estimate") base = 0;

  const modeMultiplier = input.mode === "premium" ? 6 : input.mode === "security" ? 3 : input.mode === "deep" ? 2 : 1;
  const riskMultiplier = input.risk === "critical" ? 3 : input.risk === "high" ? 2 : input.risk === "medium" ? 1.25 : 1;
  const scale = Math.ceil(fileCount / 50) * 5 + changedFileCount * 8 + Math.ceil(inputTokens / 20_000) * 10;
  const credits = Math.max(0, Math.ceil((base + scale) * modeMultiplier * riskMultiplier));
  const premiumCredits = input.premium ? credits : 0;
  const costUsd = estimateCostUsd({ inputTokens, outputTokens, premium: input.premium ?? false });

  return { credits, premiumCredits, inputTokens, outputTokens, costUsd };
}

export function evaluateQuota(input: {
  policy: QuotaPolicy;
  usedEvents: UsageEventRecord[];
  creditsRequired: number;
  premiumCreditsRequired: number;
  aiCallsInRun?: number;
  fileCount?: number;
  changedFileCount?: number;
  sandboxMinutes?: number;
}): QuotaDecision {
  const monthlyCreditsUsed = input.usedEvents.reduce((sum, event) => sum + event.creditsCharged, 0);
  const monthlyPremiumCreditsUsed = input.usedEvents.reduce((sum, event) => sum + event.premiumCreditsCharged, 0);
  const reason =
    input.aiCallsInRun && input.aiCallsInRun > input.policy.maxAiCallsPerRun
      ? `AI call limit exceeded for this run (${input.aiCallsInRun} > ${input.policy.maxAiCallsPerRun}).`
      : input.fileCount && input.fileCount > input.policy.maxFilesIndexed
        ? `Repo file limit exceeded (${input.fileCount} > ${input.policy.maxFilesIndexed}).`
        : input.changedFileCount && input.changedFileCount > input.policy.maxFilesChanged
          ? `Changed-file limit exceeded (${input.changedFileCount} > ${input.policy.maxFilesChanged}).`
          : input.sandboxMinutes && input.sandboxMinutes > input.policy.maxSandboxMinutes
            ? `Sandbox minute limit exceeded (${input.sandboxMinutes} > ${input.policy.maxSandboxMinutes}).`
            : monthlyPremiumCreditsUsed + input.premiumCreditsRequired > input.policy.monthlyPremiumCredits
              ? "Monthly premium model credit limit exceeded."
              : monthlyCreditsUsed + input.creditsRequired > input.policy.monthlyCredits
                ? "Monthly BootRise credit limit exceeded."
                : null;

  return {
    allowed: !reason,
    reason,
    creditsRequired: input.creditsRequired,
    premiumCreditsRequired: input.premiumCreditsRequired,
    monthlyCreditsUsed,
    monthlyPremiumCreditsUsed,
    policy: input.policy
  };
}

function estimateCostUsd(input: { inputTokens: number; outputTokens: number; premium: boolean }): number {
  if (input.premium) {
    return roundMoney((input.inputTokens / 1_000_000) * 5 + (input.outputTokens / 1_000_000) * 30);
  }
  return roundMoney((input.inputTokens / 1_000_000) * 0.25 + (input.outputTokens / 1_000_000) * 0.75);
}

function roundMoney(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
