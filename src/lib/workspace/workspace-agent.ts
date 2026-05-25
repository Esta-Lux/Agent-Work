import { createOpenAIChangePlan, hasOpenAIKey } from "@/lib/ai/openai-client";
import { createDiffPreview } from "@/lib/execution/diff-preview";
import { createDryRunExecutionResult } from "@/lib/execution/executor";
import { buildRepoIntelligenceSnapshot, type SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { ContextBuilder } from "@/lib/memory/context-builder";
import { traceBlastRadius } from "@/lib/memory/blast-radius";
import { createInitialChangePlan } from "@/lib/planning/planner";
import { createChangeReport } from "@/lib/reporting/change-report";
import { createRepoHealthSummary } from "@/lib/reporting/repo-health";
import { upsertRecord, memoryStore } from "@/lib/persistence/memory-store";
import type { ChangePlan, DiffPreview, RepoIntelligenceSnapshot } from "@/lib/types/core";
import { runVerificationChecks } from "@/lib/verification/verification-runner";
import { createVerificationSummary } from "@/lib/verification/verification-summary";

export interface ProjectBrief {
  productName: string;
  audience: string;
  primaryWorkflow: string;
  authRequired: boolean;
  paymentsRequired: boolean;
  deploymentTarget: string;
  constraints: string[];
  longBuild: boolean;
}

export interface DiscoveryQuestion {
  id: string;
  prompt: string;
  whyItMatters: string;
}

export interface FeatureAdvice {
  feature: string;
  recommendation: "recommended" | "caution" | "defer";
  userReaction: string;
  builderImpact: string;
}

export interface WorkspaceFixReport {
  repositoryId: string;
  plan: ChangePlan;
  diff: DiffPreview;
  blastRadius: string[];
  fixed: Array<{ path: string; summary: string }>;
  potentiallyBroken: string[];
  howFixed: string[];
  verificationSummary: ReturnType<typeof createVerificationSummary>;
  residualRisk: string[];
  guidanceForBuilder: string[];
}

export interface WorkspaceChatContext {
  projectBrief?: ProjectBrief;
  hasCode?: boolean;
  lastReport?: WorkspaceFixReport | null;
}

export interface WorkspaceChatResult {
  reply: string;
  discoveryQuestions: DiscoveryQuestion[];
  featureAdvice: FeatureAdvice[];
  suggestedActions: string[];
  phase: "discovery" | "planning" | "building" | "review" | "export";
}

const DEFAULT_BRIEF: ProjectBrief = {
  productName: "New startup product",
  audience: "Early adopters",
  primaryWorkflow: "Sign up, complete core task, return weekly",
  authRequired: false,
  paymentsRequired: false,
  deploymentTarget: "vercel",
  constraints: [],
  longBuild: false
};

export function getDiscoveryQuestions(brief?: Partial<ProjectBrief>): DiscoveryQuestion[] {
  const merged = { ...DEFAULT_BRIEF, ...brief };
  const questions: DiscoveryQuestion[] = [
    {
      id: "audience",
      prompt: `Who is the primary user for ${merged.productName}, and what job are they hiring it to do?`,
      whyItMatters: "BootRise keeps architecture decisions aligned with real user behavior, not feature lists."
    },
    {
      id: "workflow",
      prompt: `Walk through the happy path for: "${merged.primaryWorkflow}". What must never break?`,
      whyItMatters: "The approval gate and blast-radius checks prioritize flows that matter at launch."
    },
    {
      id: "scope",
      prompt: merged.longBuild
        ? "This looks like a long build. Which milestone should ship first: landing, auth, core workflow, or admin?"
        : "What is the smallest shippable version you want live in the next two weeks?",
      whyItMatters: "BootRise sequences work so startups can bootstrap without overbuilding."
    },
    {
      id: "data",
      prompt: `Do you need accounts (${merged.authRequired ? "yes" : "optional"}) and payments (${merged.paymentsRequired ? "yes" : "no"}) on day one?`,
      whyItMatters: "Auth and billing multiply blast radius; BootRise flags that before code changes land."
    },
    {
      id: "deployment",
      prompt: `Where should this deploy (${merged.deploymentTarget}) and what must be exportable to GitHub or a zip download?`,
      whyItMatters: "Export paths are part of the MVP so you are never locked into the workspace."
    }
  ];

  return questions;
}

export function createWorkspaceChatResponse(message: string, context: WorkspaceChatContext = {}): WorkspaceChatResult {
  const normalized = message.toLowerCase();
  const discoveryQuestions = getDiscoveryQuestions(context.projectBrief);
  const featureAdvice = inferFeatureAdvice(normalized);
  const suggestedActions: string[] = [];
  let phase: WorkspaceChatResult["phase"] = "discovery";
  let reply = "";

  if (!context.projectBrief?.productName || context.projectBrief.productName === DEFAULT_BRIEF.productName) {
    phase = "discovery";
    reply = [
      "Before we change code, BootRise needs a short product brief so plans stay aligned as the build grows.",
      "",
      "Answer the discovery questions on the right (or describe your product in one message).",
      "Then paste code or upload files and ask for a fix, refactor, or new feature.",
      "",
      "I will report what was fixed, what may have broken, how the fix was applied, and what to do next."
    ].join("\n");
    suggestedActions.push("Fill in product brief", "Paste repository code", "Ask: fix the auth bug in session.ts");
    return { reply, discoveryQuestions, featureAdvice, suggestedActions, phase };
  }

  if (normalized.includes("export") || normalized.includes("github") || normalized.includes("download")) {
    phase = "export";
    reply = [
      "Use Export in the workspace panel to download a BootRise bundle (plan, report, files).",
      "GitHub export records your remote URL and returns push steps once a token is configured.",
      "Nothing is trapped in BootRise — the bundle is yours to upload anywhere."
    ].join("\n");
    suggestedActions.push("Download project bundle", "Prepare GitHub push");
    return { reply, discoveryQuestions, featureAdvice, suggestedActions, phase };
  }

  if (featureAdvice.length > 0) {
    phase = "planning";
    const lines = featureAdvice.map(
      (item) =>
        `- ${item.feature}: ${item.recommendation.toUpperCase()} — ${item.userReaction} Builder impact: ${item.builderImpact}`
    );
    reply = [
      "Feature impact readout:",
      "",
      ...lines,
      "",
      context.hasCode
        ? "Paste or update code, then run Fix & report to see blast radius before merging."
        : "Add code first so BootRise can trace what this feature would break."
    ].join("\n");
    suggestedActions.push("Run fix & report", "Adjust product brief");
    return { reply, discoveryQuestions, featureAdvice, suggestedActions, phase };
  }

  if (context.lastReport) {
    phase = "review";
    reply = [
      `Last run: ${context.lastReport.plan.intent.interpretedGoal}`,
      `Fixed ${context.lastReport.fixed.length} file(s). Watch ${context.lastReport.potentiallyBroken.length} dependent area(s).`,
      "",
      ...context.lastReport.guidanceForBuilder.map((line) => `- ${line}`)
    ].join("\n");
    suggestedActions.push("Export bundle", "Run verification again", "Ask about another feature");
    return { reply, discoveryQuestions, featureAdvice, suggestedActions, phase };
  }

  if (context.hasCode) {
    phase = "building";
    reply = [
      "Code is loaded. Describe the change (fix, refactor, or feature) and click Fix & report.",
      "BootRise will plan the change, trace blast radius, generate a diff preview, and list what may break."
    ].join("\n");
    suggestedActions.push("Fix & report", "Create plan only");
  } else {
    phase = "discovery";
    reply = [
      `Brief locked for "${context.projectBrief?.productName}".`,
      "Paste JSON files `[{ \"path\": \"...\", \"content\": \"...\" }]` or use the sample, then ask what to build or fix."
    ].join("\n");
    suggestedActions.push("Paste code", "Fix & report");
  }

  return { reply, discoveryQuestions, featureAdvice, suggestedActions, phase };
}

export async function executeFixWorkflow(
  files: SourceFileInput[],
  request: string
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

  if (hasOpenAIKey()) {
    try {
      const ai = await createOpenAIChangePlan(request, repo, fallbackPlan);
      plan = ai.plan;
      plannerSource = `openai:${ai.model}`;
    } catch {
      plannerSource = "deterministic-fallback";
    }
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

  return {
    repositoryId,
    repo,
    health: createRepoHealthSummary(repo),
    report,
    plannerSource
  };
}

export function createExportBundle(input: {
  projectBrief: ProjectBrief;
  files: SourceFileInput[];
  plan?: ChangePlan;
  report?: WorkspaceFixReport;
}) {
  return {
    format: "bootrise-bundle-v1" as const,
    exportedAt: new Date().toISOString(),
    product: "BootRise",
    projectBrief: input.projectBrief,
    files: input.files,
    plan: input.plan ?? null,
    report: input.report
      ? {
          fixed: input.report.fixed,
          potentiallyBroken: input.report.potentiallyBroken,
          howFixed: input.report.howFixed,
          residualRisk: input.report.residualRisk,
          guidanceForBuilder: input.report.guidanceForBuilder
        }
      : null,
    readme: [
      "# BootRise export",
      "",
      "This bundle contains your product brief, source files, and the last plan/report from the workspace.",
      "",
      "## GitHub",
      "Create a repo, then push these files or use BootRise GitHub export with a personal access token.",
      "",
      "## Deploy",
      `Target noted in brief: ${input.projectBrief.deploymentTarget}`
    ].join("\n")
  };
}

function inferFeatureAdvice(message: string): FeatureAdvice[] {
  const advice: FeatureAdvice[] = [];

  if (message.includes("chat") || message.includes("messaging")) {
    advice.push({
      feature: "Real-time chat",
      recommendation: "defer",
      userReaction: "Users expect reliability and moderation; half-built chat erodes trust.",
      builderImpact: "Adds websocket infra, presence, and moderation — high blast radius early."
    });
  }

  if (message.includes("payment") || message.includes("stripe") || message.includes("billing")) {
    advice.push({
      feature: "Payments",
      recommendation: "caution",
      userReaction: "Paying users expect invoices, refunds, and clear pricing — mistakes are costly.",
      builderImpact: "Touches auth, webhooks, and schema; BootRise should verify contracts before merge."
    });
  }

  if (message.includes("analytics") || message.includes("tracking")) {
    advice.push({
      feature: "Analytics",
      recommendation: "recommended",
      userReaction: "Founders need signal on drop-off without changing core product behavior.",
      builderImpact: "Usually isolated; good after core workflow ships."
    });
  }

  if (message.includes("admin") || message.includes("dashboard")) {
    advice.push({
      feature: "Admin dashboard",
      recommendation: "caution",
      userReaction: "Operators love control, but users never see it — don't block launch on admin polish.",
      builderImpact: "Keep admin at /admin; ship user-facing workflow first."
    });
  }

  return advice;
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
