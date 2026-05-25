import { formatGithubReviewReply, type GithubRepoInsight } from "@/lib/workspace/github-inspector";
import { isProductCodeReviewQuestion } from "@/lib/workspace/workspace-code-context";
import {
  getDiscoveryQuestions,
  isBriefReady,
  type FeatureAdvice,
  type FileActivity,
  type ThinkingStep,
  type WorkspaceChatContext,
  type WorkspaceChatResult
} from "@/lib/workspace/workspace-types";

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
    reply = formatGithubReviewReply(g);
    suggestedActions.push("Connect repo & import files", "Run Fix and report", "Save project");
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

  if (isProductCodeReviewQuestion(message) && context.hasCode) {
    phase = "review";
    reply = "Analyzing your question against loaded source files…";
    suggestedActions.push("Import full repo if navigation files are missing", "Run Fix and report on one specific change");
    thinkingSteps.push({ id: "review", label: "Code review", status: "active", detail: "Waiting for NVIDIA/OpenAI" });
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

  if (context.lastReport && !isProductCodeReviewQuestion(message)) {
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
