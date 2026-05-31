import { evaluateVagueOutputGuard } from "@/lib/control/vague-output-guard";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { LlmProviderId } from "@/lib/ai/providers";
import { createProviderChatResponse } from "@/lib/ai/llm-router";
import type { ProductBrainContext } from "@/lib/product-brain/product-brain-types";

export interface ProviderDuelInput {
  task: string;
  files: SourceFileInput[];
  premiumAllowed?: boolean;
  productContext?: ProductBrainContext;
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
  tokenEstimate: number;
  costEstimate: number;
  confidence: number;
  planExcerpt?: string;
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
      premiumAllowed: true,
      productContext: input.productContext
    }),
    scoreProvider({
      provider: "openai",
      task,
      files: input.files,
      available: Boolean(process.env.OPENAI_API_KEY?.trim()),
      premiumAllowed: Boolean(input.premiumAllowed),
      productContext: input.productContext
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
  productContext?: ProductBrainContext;
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
      recommendation: "not_available",
      tokenEstimate: 0,
      costEstimate: 0,
      confidence: 0
    };
  }

  const contextRisk = input.files.some((file) =>
    /auth|billing|security|supabase|middleware/i.test(file.path)
  );

  try {
    const prompt = [
      `Task: ${input.task}`,
      `Files in scope (non-mutating planning only): ${input.files.slice(0, 20).map((file) => file.path).join(", ")}`,
      input.productContext ? `Product context: ${input.productContext.summary}` : "",
      "Return a scoped implementation plan only. Do not output code fences."
    ]
      .filter(Boolean)
      .join("\n");
    const result = await withTimeout(
      createProviderChatResponse({
        provider: input.provider as LlmProviderId,
        message: prompt,
        history: [],
        system:
          "You are a non-mutating planning agent. Return concise scoped steps, risks, and test plan. Never claim patches were applied."
      }),
      45_000,
      `${input.provider} duel run timed out.`
    );
    const planText = result.text.trim();
    const patchGuard = evaluateVagueOutputGuard(
      planText
        ? [{ path: `${input.provider}-plan`, before: "", after: planText, summary: `Plan for ${input.task}` }]
        : [{ path: `${input.provider}-empty`, before: "", after: "", summary: "No plan generated." }]
    );
    const hasScopeViolations = /main|master|rewrite everything|touch all files/i.test(planText);
    const blocked = patchGuard.blocked || !planText || hasScopeViolations;
    const completionScore = blocked
      ? Math.max(0, 45 - patchGuard.findings.length * 20 - (hasScopeViolations ? 20 : 0))
      : Math.min(99, 92 - patchGuard.findings.length * 8 - (contextRisk ? 6 : 0));
    const tokenEstimate = Math.ceil(planText.length / 4);
    const costEstimate = input.provider === "openai" ? tokenEstimate * 0.00003 : tokenEstimate * 0.000012;
    const confidence = blocked ? 20 : Math.max(45, 95 - patchGuard.findings.length * 12 - (contextRisk ? 8 : 0));
    return {
      provider: input.provider,
      available: true,
      model: result.model,
      estimatedCredits: input.provider === "openai" ? 20 : 10,
      completionScore,
      vagueOutputFindings: patchGuard.findings.length,
      securityConcerns: [
        ...(contextRisk ? ["High-risk files in context require stricter review."] : []),
        ...(hasScopeViolations ? ["Plan appears to exceed scope or target protected branches."] : [])
      ],
      recommendation: blocked
        ? "blocked"
        : input.provider === "bootrise"
          ? "cheapest_safe"
          : "most_complete",
      tokenEstimate,
      costEstimate: Number(costEstimate.toFixed(4)),
      confidence,
      planExcerpt: planText.slice(0, 280),
      summary: blocked ? "Plan blocked by guard checks." : "Plan passed non-mutating guard checks."
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
      tokenEstimate: 0,
      costEstimate: 0,
      confidence: 0,
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
