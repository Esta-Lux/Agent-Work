import { evaluateVagueOutputGuard } from "@/lib/control/vague-output-guard";
import { evaluateTaskCompletion } from "@/lib/control/task-completion-evaluator";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { LlmProviderId } from "@/lib/ai/providers";
import { createPendingFixPlan } from "@/lib/workspace/workspace-fix.server";

export interface ProviderDuelInput {
  task: string;
  files: SourceFileInput[];
  premiumAllowed?: boolean;
}

export interface ProviderDuelResult {
  provider: "bootrise" | "openai";
  available: boolean;
  model?: string;
  estimatedCredits: number;
  completionScore: number;
  vagueOutputFindings: number;
  securityConcerns: string[];
  recommendation: "cheapest_safe" | "most_complete" | "blocked" | "not_available";
  patchCount?: number;
  summary?: string;
}

export async function runProviderDuel(
  input: ProviderDuelInput
): Promise<{ results: ProviderDuelResult[]; recommendation: string }> {
  const task = input.task.trim();
  const [bootrise, openai] = await Promise.all([
    scoreProvider({
      provider: "bootrise",
      task,
      files: input.files,
      available: Boolean(process.env.NVIDIA_API_KEY?.trim()),
      premiumAllowed: true
    }),
    scoreProvider({
      provider: "openai",
      task,
      files: input.files,
      available: Boolean(process.env.OPENAI_API_KEY?.trim()),
      premiumAllowed: Boolean(input.premiumAllowed)
    })
  ]);

  const available = [bootrise, openai].filter(
    (result) => result.available && result.recommendation !== "blocked"
  );
  const best = available.sort(
    (a, b) => b.completionScore - a.completionScore || a.estimatedCredits - b.estimatedCredits
  )[0];
  return {
    results: [bootrise, openai],
    recommendation: best
      ? `${best.provider} is the current safest comparison winner.`
      : "Both providers are unavailable or blocked for this comparison."
  };
}

async function scoreProvider(input: {
  provider: ProviderDuelResult["provider"];
  task: string;
  files: SourceFileInput[];
  available: boolean;
  premiumAllowed: boolean;
}): Promise<ProviderDuelResult> {
  const baselineGuard = evaluateVagueOutputGuard([
    { path: `${input.provider}-task`, before: "", after: input.task, summary: input.task }
  ]);
  if (!input.available || (input.provider === "openai" && !input.premiumAllowed)) {
    return {
      provider: input.provider,
      available: false,
      estimatedCredits: input.provider === "openai" ? 20 : 10,
      completionScore: 0,
      vagueOutputFindings: baselineGuard.findings.length,
      securityConcerns: [],
      recommendation: "not_available"
    };
  }

  const contextRisk = input.files.some((file) =>
    /auth|billing|security|supabase|middleware/i.test(file.path)
  );

  try {
    const result = await withTimeout(
      createPendingFixPlan(input.files, input.task, input.provider as LlmProviderId, {
        assumptionsApproved: true
      }),
      45_000,
      `${input.provider} duel run timed out.`
    );
    const patches = result.report.patches ?? [];
    const patchGuard = evaluateVagueOutputGuard(
      patches.length > 0
        ? patches
        : [{ path: `${input.provider}-empty`, before: "", after: "", summary: "No patch generated." }]
    );
    const completion = evaluateTaskCompletion({
      request: input.task,
      plan: result.report.plan,
      patches
    });
    const blocked = patchGuard.blocked || completion.blocked || patches.length === 0;
    const completionScore = blocked
      ? Math.max(0, 45 - patchGuard.findings.length * 20 - completion.findings.length * 10)
      : Math.min(99, 92 - patchGuard.findings.length * 8 - (contextRisk ? 6 : 0));
    return {
      provider: input.provider,
      available: true,
      model: result.plannerSource,
      estimatedCredits: input.provider === "openai" ? 20 : 10,
      completionScore,
      vagueOutputFindings: patchGuard.findings.length,
      securityConcerns: contextRisk ? ["High-risk files in context require stricter review."] : [],
      recommendation: blocked
        ? "blocked"
        : input.provider === "bootrise"
          ? "cheapest_safe"
          : "most_complete",
      patchCount: patches.length,
      summary: completion.summary
    };
  } catch (error) {
    return {
      provider: input.provider,
      available: true,
      estimatedCredits: input.provider === "openai" ? 20 : 10,
      completionScore: 0,
      vagueOutputFindings: baselineGuard.findings.length,
      securityConcerns: [],
      recommendation: "blocked",
      summary: error instanceof Error ? error.message : "Provider duel generation failed."
    };
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
