import { createOpenAIChangePlan, hasOpenAIKey } from "@/lib/ai/openai-client";
import type { GithubRepoInsight } from "@/lib/workspace/github-inspector";
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
  loadedFilePaths?: string[];
  lastReport?: WorkspaceFixReport | null;
}

export interface ThinkingStep {
  id: string;
  label: string;
  status: "done" | "active" | "pending";
  detail?: string;
}

export interface FileActivity {
  path: string;
  status: "queued" | "reading" | "analyzing" | "planned" | "fixed" | "at-risk";
  detail: string;
}

export interface WorkspaceChatResult {
  reply: string;
  discoveryQuestions: DiscoveryQuestion[];
  featureAdvice: FeatureAdvice[];
  suggestedActions: string[];
  phase: "discovery" | "planning" | "building" | "review" | "export";
  thinkingSteps: ThinkingStep[];
  fileActivity: FileActivity[];
  triggerFix?: boolean;
}

export function isBriefReady(brief?: Partial<ProjectBrief>): boolean {
  return Boolean(brief?.productName?.trim() && brief?.primaryWorkflow?.trim());
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

export function createWorkspaceChatResponse(
  message: string,
  context: WorkspaceChatContext = {},
  options?: { githubReview?: GithubRepoInsight }
): WorkspaceChatResult {
  const normalized = message.toLowerCase();
  const discoveryQuestions = getDiscoveryQuestions(context.projectBrief);
  const featureAdvice = inferFeatureAdvice(normalized);
  const suggestedActions: string[] = [];
  const fileActivity = buildFileActivity(context);
  let phase: WorkspaceChatResult["phase"] = "discovery";
  let reply = "";
  let triggerFix = false;

  const thinkingSteps: ThinkingStep[] = [
    { id: "intent", label: "Understand request", status: "done", detail: summarizeIntent(message) },
    {
      id: "context",
      label: "Load workspace context",
      status: "done",
      detail: `${context.loadedFilePaths?.length ?? 0} file(s) in workspace`
    },
    { id: "respond", label: "Compose guidance", status: "done" }
  ];

  if (isCapabilitiesQuestion(normalized)) {
    phase = "discovery";
    reply = buildCapabilitiesReply(context);
    suggestedActions.push("Paste code", "Run Fix and report", "Fill product brief");
    return wrapResult({ reply, discoveryQuestions, featureAdvice, suggestedActions, phase, thinkingSteps, fileActivity });
  }

  if (options?.githubReview) {
    const g = options.githubReview;
    phase = "planning";
    reply = [
      `GitHub review: ${g.owner}/${g.repo}`,
      g.description ? `Description: ${g.description}` : "",
      `Default branch: ${g.defaultBranch}${g.isPrivate ? " (private)" : ""}`,
      g.stackHints.length ? `Stack signals: ${g.stackHints.join(", ")}` : "",
      g.topLevelEntries.length ? `Top-level: ${g.topLevelEntries.join(", ")}` : "",
      "",
      "BootRise notes:",
      ...g.bootriseNotes.map((note) => `- ${note}`),
      "",
      context.hasCode
        ? "You already have files pasted — run Fix and report on the module you want changed."
        : "Paste the files you want to change (e.g. auth, API routes) into Code intake, then run Fix and report."
    ]
      .filter(Boolean)
      .join("\n");
    suggestedActions.push("Paste key files", "Run Fix and report");
    if (g.fetchError) {
      thinkingSteps.push({ id: "github", label: "GitHub metadata", status: "done", detail: g.fetchError });
    } else {
      thinkingSteps.push({ id: "github", label: "GitHub metadata", status: "done", detail: `Loaded ${g.owner}/${g.repo}` });
    }
    return wrapResult({ reply, discoveryQuestions, featureAdvice, suggestedActions, phase, thinkingSteps, fileActivity });
  }

  if (
    normalized.includes("export") ||
    normalized.includes("download bundle") ||
    (normalized.includes("push") && normalized.includes("github"))
  ) {
    phase = "export";
    reply = [
      "Export workflow:",
      "1. Download bundle — saves plan, report, and files as JSON.",
      "2. Prepare GitHub push — enter your remote URL in the Export panel for push steps.",
      "",
      "Export does not replace a fix report — run Fix and report first if you need change evidence."
    ].join("\n");
    suggestedActions.push("Download project bundle", "Prepare GitHub push");
    return wrapResult({ reply, discoveryQuestions, featureAdvice, suggestedActions, phase, thinkingSteps, fileActivity });
  }

  if (!isBriefReady(context.projectBrief)) {
    phase = "discovery";
    reply = [
      "I can help without a full brief, but filling Product name + Primary workflow improves planning.",
      "",
      buildCapabilitiesReply(context),
      "",
      "Next: paste code in Code intake, or describe your product in one message (name, users, main workflow)."
    ].join("\n");
    suggestedActions.push("Fill in product brief", "Paste repository code", "Ask: fix the auth bug in session.ts");
    return wrapResult({ reply, discoveryQuestions, featureAdvice, suggestedActions, phase, thinkingSteps, fileActivity });
  }

  if (wantsFixRun(normalized) && context.hasCode) {
    triggerFix = true;
    phase = "building";
    reply = [
      "Running fix pipeline on your pasted files.",
      "You will see: symbol graph → blast radius → plan → diff → verification → report."
    ].join("\n");
    suggestedActions.push("Review fix report");
    thinkingSteps.push({ id: "fix", label: "Execute fix pipeline", status: "active" });
    return wrapResult({
      reply,
      discoveryQuestions,
      featureAdvice,
      suggestedActions,
      phase,
      thinkingSteps,
      fileActivity,
      triggerFix
    });
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
    return wrapResult({ reply, discoveryQuestions, featureAdvice, suggestedActions, phase, thinkingSteps, fileActivity });
  }

  if (context.lastReport) {
    phase = "review";
    const r = context.lastReport;
    reply = [
      `Last run: ${r.plan.intent.interpretedGoal}`,
      "",
      "Fixed:",
      ...r.fixed.map((f) => `- ${f.path}: ${f.summary}`),
      "",
      "May break:",
      ...(r.potentiallyBroken.length ? r.potentiallyBroken.map((b) => `- ${b}`) : ["- None flagged"]),
      "",
      "How:",
      ...r.howFixed.map((h) => `- ${h}`),
      "",
      "Guidance:",
      ...r.guidanceForBuilder.map((g) => `- ${g}`)
    ].join("\n");
    suggestedActions.push("Export bundle", "Run Fix and report again", "Ask about another feature");
    return wrapResult({ reply, discoveryQuestions, featureAdvice, suggestedActions, phase, thinkingSteps, fileActivity });
  }

  if (context.hasCode) {
    phase = "building";
    reply = [
      `Workspace: ${context.loadedFilePaths?.length ?? 0} file(s) loaded for "${context.projectBrief?.productName}".`,
      "",
      "Say what to change (e.g. fix auth session) or click Fix and report.",
      "I will show each file touched, blast radius, and a before/after diff preview."
    ].join("\n");
    suggestedActions.push("Fix & report", "Ask: what will break if I add payments?");
  } else {
    phase = "discovery";
    reply = [
      `Brief: "${context.projectBrief?.productName}" — ${context.projectBrief?.primaryWorkflow}`,
      "",
      "Paste code as JSON in Code intake, then ask for a fix or feature."
    ].join("\n");
    suggestedActions.push("Paste code", "Fix & report");
  }

  return wrapResult({ reply, discoveryQuestions, featureAdvice, suggestedActions, phase, thinkingSteps, fileActivity });
}

export const FIX_PIPELINE_STEPS: ThinkingStep[] = [
  { id: "parse", label: "Parse uploaded files", status: "pending" },
  { id: "symbols", label: "Build symbol graph", status: "pending" },
  { id: "blast", label: "Trace blast radius", status: "pending" },
  { id: "plan", label: "Create change plan", status: "pending" },
  { id: "diff", label: "Generate diff preview", status: "pending" },
  { id: "verify", label: "Run verification checks", status: "pending" },
  { id: "report", label: "Publish fix report", status: "pending" }
];

function wrapResult(result: WorkspaceChatResult): WorkspaceChatResult {
  return result;
}

function isCapabilitiesQuestion(normalized: string): boolean {
  return (
    normalized.includes("what can you do") ||
    normalized.includes("what do you do") ||
    normalized.includes("capabilities") ||
    normalized.includes("how do you work") ||
    normalized.includes("help me understand")
  );
}

function wantsFixRun(normalized: string): boolean {
  return (
    normalized.includes("fix") ||
    normalized.includes("repair") ||
    normalized.includes("refactor") ||
    normalized.includes("run fix") ||
    normalized.includes("apply change")
  );
}

function summarizeIntent(message: string): string {
  const trimmed = message.trim().slice(0, 80);
  return trimmed.length > 0 ? trimmed : "General workspace question";
}

function buildCapabilitiesReply(context: WorkspaceChatContext): string {
  return [
    "BootRise helps you bootstrap a startup codebase end-to-end:",
    "",
    "1. Discovery — product brief and guided questions so scope stays clear on long builds.",
    "2. Code intake — paste files; I map symbols and dependencies.",
    "3. Fix and report — plan → blast radius → diff → what was fixed / what may break / how.",
    "4. Feature advice — whether additions help or hurt your users before you build them.",
    "5. Export — download a bundle or prepare a GitHub push.",
    "",
    context.hasCode
      ? `You have ${context.loadedFilePaths?.length ?? 0} file(s) loaded. Ask for a fix or click Fix and report.`
      : "Paste code in Code intake to start analysis."
  ].join("\n");
}

function buildFileActivity(context: WorkspaceChatContext): FileActivity[] {
  const paths = context.loadedFilePaths ?? [];
  if (paths.length === 0) return [];

  return paths.map((path) => {
    const fromReport = context.lastReport?.fixed.find((f) => f.path === path);
    const atRisk = context.lastReport?.potentiallyBroken.some((b) => b.includes(path));
    let status: FileActivity["status"] = "reading";
    let detail = "Loaded in workspace";

    if (fromReport) {
      status = "fixed";
      detail = fromReport.summary;
    } else if (atRisk) {
      status = "at-risk";
      detail = "May be affected by last change";
    } else if (context.lastReport) {
      status = "analyzing";
      detail = "Reviewed in last plan";
    }

    return { path, status, detail };
  });
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
