import { createProviderChangePlan } from "@/lib/ai/llm-router";
import type { LlmProviderId } from "@/lib/ai/providers";
import { createDiffPreview } from "@/lib/execution/diff-preview";
import { createDryRunExecutionResult } from "@/lib/execution/executor";
import { buildRepoIntelligenceSnapshot, type SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { ContextBuilder } from "@/lib/memory/context-builder";
import { traceBlastRadius } from "@/lib/memory/blast-radius";
import { createInitialChangePlan } from "@/lib/planning/planner";
import { createChangeReport } from "@/lib/reporting/change-report";
import { createRepoHealthSummary } from "@/lib/reporting/repo-health";
import { upsertRecord, memoryStore } from "@/lib/persistence/memory-store";
import type { ChangePlan, RepoIntelligenceSnapshot } from "@/lib/types/core";
import { buildPlainEnglishFromReport } from "@/lib/workspace/plain-english";
import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";
import { runVerificationChecks } from "@/lib/verification/verification-runner";
import { createVerificationSummary } from "@/lib/verification/verification-summary";

export async function executeFixWorkflow(
  files: SourceFileInput[],
  request: string,
  provider: LlmProviderId = "bootrise"
): Promise<{
  repositoryId: string;
  repo: RepoIntelligenceSnapshot;
  health: ReturnType<typeof createRepoHealthSummary>;
  report: WorkspaceFixReport;
  plannerSource: string;
}> {
  const repo = buildRepoIntelligenceSnapshot(files);
  const repositoryId = `repo_${Date.now()}`;
  const now = new Date().toISOString();

  upsertRecord(memoryStore.repositories, {
    id: repositoryId,
    name: "Workspace Repository",
    source: "uploaded",
    createdAt: now,
    updatedAt: now
  });

  const builder = new ContextBuilder(files);
  await builder.persistStaticMemory(repositoryId);

  const rootSymbol = repo.symbols.find((symbol) => symbol.exported)?.name ?? repo.symbols[0]?.name ?? "Page";
  const blast = await traceBlastRadius(repositoryId, rootSymbol);

  const fallbackPlan = createInitialChangePlan(request, repo);
  let plan = fallbackPlan;
  let plannerSource = "deterministic";

  try {
    const ai = await createProviderChangePlan(provider, request, repo, fallbackPlan);
    plan = ai.plan;
    plannerSource = `${ai.provider}:${ai.model}`;
  } catch {
    plannerSource = "deterministic-fallback";
  }

  upsertRecord(memoryStore.plans, {
    id: plan.id,
    repositoryId,
    plan,
    status: "approved",
    createdAt: now
  });

  const diff = createDiffPreview(plan);
  const execution = createDryRunExecutionResult(plan);
  const verificationChecks = (await runVerificationChecks(plan.validations)).checks;
  const verificationSummary = createVerificationSummary(plan);
  const changeReport = createChangeReport(plan, execution, verificationChecks);

  const fixed = diff.files.map((file) => ({
    path: file.path,
    summary: file.summary
  }));

  const potentiallyBroken = Array.from(
    new Set([
      ...plan.impact.blastRadius,
      ...blast.impactedSymbols.map((symbol) => `${symbol.filePath} (${symbol.symbolName})`)
    ])
  );

  const report: WorkspaceFixReport = {
    repositoryId,
    plan,
    diff,
    blastRadius: plan.impact.blastRadius,
    fixed,
    potentiallyBroken,
    howFixed: plan.steps.map((step) => `${step.title}: ${step.summary}`),
    verificationSummary,
    residualRisk: changeReport.residualRisk,
    guidanceForBuilder: buildGuidance(request, plan, potentiallyBroken)
  };
  report.plainEnglishSummary = buildPlainEnglishFromReport(report);

  return {
    repositoryId,
    repo,
    health: createRepoHealthSummary(repo),
    report,
    plannerSource
  };
}

function buildGuidance(request: string, plan: ChangePlan, potentiallyBroken: string[]): string[] {
  const guidance = [
    "Review the diff preview before applying changes to your real repository.",
    "Run verification locally after merging BootRise output.",
    "Export the bundle before deployment so you retain a snapshot."
  ];

  if (potentiallyBroken.length > 0) {
    guidance.push(`Re-test areas touched by blast radius: ${potentiallyBroken.slice(0, 5).join(", ")}`);
  }

  if (plan.risk.level === "high") {
    guidance.push("High risk change — ship behind a feature flag or split into smaller approved plans.");
  }

  if (request.toLowerCase().includes("feature")) {
    guidance.push("For new features, answer discovery questions first so scope does not expand mid-build.");
  }

  return guidance;
}
