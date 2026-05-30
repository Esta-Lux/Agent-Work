import { evaluateVagueOutputGuard } from "@/lib/control/vague-output-guard";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export interface ProviderDuelInput {
  task: string;
  files: SourceFileInput[];
  premiumAllowed?: boolean;
}

export interface ProviderDuelResult {
  provider: "bootrise" | "openai";
  available: boolean;
  estimatedCredits: number;
  completionScore: number;
  vagueOutputFindings: number;
  securityConcerns: string[];
  recommendation: "cheapest_safe" | "most_complete" | "blocked" | "not_available";
}

export function runProviderDuel(input: ProviderDuelInput): { results: ProviderDuelResult[]; recommendation: string } {
  const contextRisk = input.files.some((file) => /auth|billing|security|supabase|middleware/i.test(file.path));
  const task = input.task.trim();
  const bootrise = scoreProvider("bootrise", Boolean(process.env.NVIDIA_API_KEY?.trim()), task, contextRisk, 1);
  const openai = scoreProvider("openai", Boolean(process.env.OPENAI_API_KEY?.trim()) && Boolean(input.premiumAllowed), task, contextRisk, 2);
  const available = [bootrise, openai].filter((result) => result.available && result.recommendation !== "blocked");
  const best = available.sort((a, b) => b.completionScore - a.completionScore || a.estimatedCredits - b.estimatedCredits)[0];
  return {
    results: [bootrise, openai],
    recommendation: best ? `${best.provider} is the current safest comparison winner.` : "Both providers are unavailable or blocked for this comparison."
  };
}

function scoreProvider(
  provider: ProviderDuelResult["provider"],
  available: boolean,
  task: string,
  contextRisk: boolean,
  costMultiplier: number
): ProviderDuelResult {
  const guard = evaluateVagueOutputGuard([
    {
      path: `${provider}-plan`,
      before: "",
      after: task,
      summary: task
    }
  ]);
  const blocked = guard.blocked || !task;
  const completionScore = blocked ? 0 : Math.max(40, 88 - (contextRisk ? 8 : 0) - guard.findings.length * 20);
  return {
    provider,
    available,
    estimatedCredits: 10 * costMultiplier,
    completionScore,
    vagueOutputFindings: guard.findings.length,
    securityConcerns: contextRisk ? ["High-risk files in context require stricter review."] : [],
    recommendation: !available ? "not_available" : blocked ? "blocked" : costMultiplier === 1 ? "cheapest_safe" : "most_complete"
  };
}
