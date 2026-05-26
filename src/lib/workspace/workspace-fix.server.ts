import { createProviderChangePlan } from "@/lib/ai/llm-router";
import type { LlmProviderId } from "@/lib/ai/providers";
import { createDryRunExecutionResult } from "@/lib/execution/executor";
import { buildRepoIntelligenceSnapshot, type SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { ContextBuilder } from "@/lib/memory/context-builder";
import { traceBlastRadius } from "@/lib/memory/blast-radius";
import { createInitialChangePlan } from "@/lib/planning/planner";
import { createChangeReport } from "@/lib/reporting/change-report";
import { createRepoHealthSummary } from "@/lib/reporting/repo-health";
import { upsertRecord, memoryStore } from "@/lib/persistence/memory-store";
import type { ChangePlan, RepoIntelligenceSnapshot } from "@/lib/types/core";
import { applyPatchesToFiles } from "@/lib/workspace/apply-patches";
import { createDiffPreviewFromPatches } from "@/lib/workspace/diff-from-patches";
import {
  createPendingFixId,
  getPendingFix,
  savePendingFix,
  updatePendingFixStatus
} from "@/lib/workspace/pending-fix-store";
import { buildPlainEnglishFromReport } from "@/lib/workspace/plain-english";
import { generateRealPatches } from "@/lib/workspace/real-patches";
import { computeSafeToPr } from "@/lib/workspace/safe-to-pr";
import { createPreviewSession } from "@/lib/infrastructure/control-plane";
import { startDevPreview } from "@/lib/workspace/preview-dev-runner";
import { createWorkspacePreviewSession, getPreviewSessionRoot } from "@/lib/workspace/workspace-preview";
import type { ProposedPatch, WorkspaceFixReport } from "@/lib/workspace/workspace-types";
import { runVerificationChecks } from "@/lib/verification/verification-runner";
import { createVerificationSummary } from "@/lib/verification/verification-summary";
import { runControlGate, assertApproveAllowed, clearControlTaskSession } from "@/lib/control/control-gate";
import { recordControlEvent } from "@/lib/control/control-telemetry";
import type { ControlLayerSummary } from "@/lib/control/types";

export async function createPendingFixPlan(
  files: SourceFileInput[],
  request: string,
  provider: LlmProviderId = "bootrise"
): Promise<{
  repositoryId: string;
  repo: RepoIntelligenceSnapshot;
  health: ReturnType<typeof createRepoHealthSummary>;
  report: WorkspaceFixReport;
  plannerSource: string;
  pendingFixId: string;
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

  const scaffoldPlan = createInitialChangePlan(request, repo);
  const ai = await createProviderChangePlan(provider, request, repo, scaffoldPlan);
  const plan = ai.plan;
  const plannerSource = ai.provider === "openai" ? `chatgpt:${ai.model}` : `bootrise:${ai.model}`;

  const { patches, source: patchSource } = await generateRealPatches({ provider, request, files, plan });
  const pendingFixId = createPendingFixId();
  const controlLayer = await runControlGate({
    request,
    plan,
    files,
    patches,
    repositoryId,
    blastRadius: [
      ...plan.impact.blastRadius,
      ...blast.impactedSymbols.map((s) => `${s.filePath} (${s.symbolName})`)
    ]
  });

  savePendingFix({
    id: pendingFixId,
    repositoryId,
    request,
    plan,
    patches,
    filesSnapshot: files,
    provider,
    plannerSource,
    status: "pending_approval",
    createdAt: now,
    controlLayer
  });

  upsertRecord(memoryStore.plans, {
    id: plan.id,
    repositoryId,
    plan,
    status: "draft",
    createdAt: now
  });

  const report = await buildReportFromPatches({
    repositoryId,
    plan,
    patches,
    blast,
    request,
    patchSource,
    pendingFixId,
    approvalStatus: "pending_approval",
    controlLayer
  });
  const agentSummary = controlLayer.agentCoordination.leadSummary;
  if (!report.guidanceForBuilder.includes(agentSummary)) {
    report.guidanceForBuilder = [agentSummary, ...report.guidanceForBuilder];
  }

  return {
    repositoryId,
    repo,
    health: createRepoHealthSummary(repo),
    report,
    plannerSource,
    pendingFixId
  };
}

export async function approvePendingFix(
  pendingFixId: string,
  options?: { sandboxPassed?: boolean }
): Promise<{
  files: SourceFileInput[];
  report: WorkspaceFixReport;
  previewSessionId: string;
  previewUrl: string;
  devPreviewStatus: string;
  devPreviewLog: string[];
}> {
  const pending = await getPendingFix(pendingFixId);
  if (!pending) throw new Error("Pending fix not found. Run Fix and report again.");
  if (pending.status === "rejected") throw new Error("This plan was rejected. Create a new fix request.");
  if (pending.status === "approved") throw new Error("This plan was already approved.");

  if (pending.controlLayer) {
    assertApproveAllowed(pending.controlLayer);
  } else {
    const controlLayer = await runControlGate({
      request: pending.request,
      plan: pending.plan,
      files: pending.filesSnapshot,
      patches: pending.patches,
      repositoryId: pending.repositoryId
    });
    assertApproveAllowed(controlLayer);
  }

  clearControlTaskSession(pending.repositoryId, pending.request);

  void recordControlEvent({
    action: "fix_approved",
    detail: pending.request.slice(0, 120),
    repositoryId: pending.repositoryId,
    severity: "info"
  });

  const appliedPatches = pending.patches.map((p) => ({ ...p, applied: true }));
  const { files } = applyPatchesToFiles(pending.filesSnapshot, appliedPatches);

  updatePendingFixStatus(pendingFixId, "approved");
  upsertRecord(memoryStore.plans, {
    id: pending.plan.id,
    repositoryId: pending.repositoryId,
    plan: pending.plan,
    status: "approved",
    createdAt: pending.createdAt
  });

  const preview = createWorkspacePreviewSession({
    files,
    patches: appliedPatches,
    repositoryId: pending.repositoryId
  });

  const previewMode = process.env.BOOTRISE_PREVIEW_MODE?.trim() || "auto";
  const useHostDev = previewMode === "host" || previewMode === "auto";

  const devPreview = useHostDev
    ? await startDevPreview({
        sessionId: preview.id,
        previewRoot: getPreviewSessionRoot(preview.id),
        files
      })
    : {
        id: preview.id,
        status: "static_only" as const,
        port: null,
        proxyUrl: `/api/workspace/preview/proxy/${preview.id}/`,
        staticUrl: preview.entryUrl,
        framework: "WebContainer",
        cwd: null,
        log: ["Host dev disabled — use in-browser WebContainer in Verify tab."],
        updatedAt: new Date().toISOString()
      };

  await createPreviewSession({
    repositoryId: pending.repositoryId,
    mode: "webcontainer",
    framework: devPreview.framework
  });

  const previewUrl =
    previewMode === "webcontainer"
      ? preview.entryUrl
      : devPreview.status === "ready" || devPreview.status === "starting" || devPreview.status === "installing"
        ? devPreview.proxyUrl
        : preview.entryUrl;

  const blast = await traceBlastRadius(pending.repositoryId, pending.plan.impact.files[0] ?? "Page");

  const report = await buildReportFromPatches({
    repositoryId: pending.repositoryId,
    plan: pending.plan,
    patches: appliedPatches,
    blast,
    request: pending.request,
    patchSource: "applied",
    pendingFixId,
    approvalStatus: "approved",
    previewSessionId: preview.id,
    previewUrl,
    sandboxPassed: options?.sandboxPassed ?? false,
    devPreviewStatus: devPreview.status,
    controlLayer: pending.controlLayer
  });

  return {
    files,
    report,
    previewSessionId: preview.id,
    previewUrl,
    devPreviewStatus: devPreview.status,
    devPreviewLog: devPreview.log
  };
}

export async function rejectPendingFix(pendingFixId: string): Promise<void> {
  const pending = await getPendingFix(pendingFixId);
  if (!pending) throw new Error("Pending fix not found.");
  void recordControlEvent({
    action: "fix_rejected",
    detail: pending.request.slice(0, 120),
    repositoryId: pending.repositoryId
  });
  updatePendingFixStatus(pendingFixId, "rejected");
}

/** @deprecated Use createPendingFixPlan — kept for compatibility */
export async function executeFixWorkflow(
  files: SourceFileInput[],
  request: string,
  provider: LlmProviderId = "bootrise"
) {
  return createPendingFixPlan(files, request, provider);
}

async function buildReportFromPatches(input: {
  repositoryId: string;
  plan: ChangePlan;
  patches: ProposedPatch[];
  blast: Awaited<ReturnType<typeof traceBlastRadius>>;
  request: string;
  patchSource: string;
  pendingFixId: string;
  approvalStatus: WorkspaceFixReport["approvalStatus"];
  previewSessionId?: string;
  previewUrl?: string;
  sandboxPassed?: boolean;
  devPreviewStatus?: string;
  controlLayer?: ControlLayerSummary;
}): Promise<WorkspaceFixReport> {
  const diff = createDiffPreviewFromPatches(input.plan.id, input.patches, input.plan.risk.reasons);
  const execution = createDryRunExecutionResult(input.plan);
  const verificationRun = await runVerificationChecks(input.plan.validations);
  const verificationChecks = verificationRun.checks;
  const verificationSummary = createVerificationSummary(input.plan);
  const changeReport = createChangeReport(input.plan, execution, verificationChecks);

  const potentiallyBroken = Array.from(
    new Set([
      ...input.plan.impact.blastRadius,
      ...input.blast.impactedSymbols.map((symbol) => `${symbol.filePath} (${symbol.symbolName})`)
    ])
  );

  const hasReal = input.patches.length > 0 && input.approvalStatus === "approved";

  const report: WorkspaceFixReport = {
    repositoryId: input.repositoryId,
    plan: input.plan,
    diff,
    blastRadius: input.plan.impact.blastRadius,
    fixed: input.patches.map((p) => ({ path: p.path, summary: p.summary })),
    potentiallyBroken,
    howFixed: input.plan.steps.map((step) => `${step.title}: ${step.summary}`),
    verificationSummary,
    residualRisk: changeReport.residualRisk,
    guidanceForBuilder: buildGuidance(input.request, input.plan, potentiallyBroken),
    pendingFixId: input.pendingFixId,
    patches: input.patches,
    patchSource: input.patchSource,
    approvalStatus: input.approvalStatus,
    planReviewStatus: input.approvalStatus === "pending_approval" ? "pending_approval" : "ready_for_review",
    previewSessionId: input.previewSessionId ?? null,
    previewUrl: input.previewUrl ?? null,
    devPreviewStatus: input.devPreviewStatus ?? null,
    controlLayer: input.controlLayer
  };

  report.plainEnglishSummary = buildPlainEnglishFromReport(report);
  report.safeToPr = computeSafeToPr({
    report,
    sandboxPassed: input.sandboxPassed ?? false,
    hasRealRepoPatches: hasReal
  });

  return report;
}

function buildGuidance(request: string, plan: ChangePlan, potentiallyBroken: string[]): string[] {
  const guidance = [
    "BootRise holds changes behind the approval gate so your architecture stays explainable until you deliberately apply patches.",
    "Open Verify to run the dev preview (npm install + dev server when package.json is present) or static staged files as fallback.",
    "Run sandbox verify after approval — BootRise uses it as build proof for Safe to PR.",
    "Review the architecture map and Living Ledger to see downstream impact before exporting or pushing to GitHub."
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
