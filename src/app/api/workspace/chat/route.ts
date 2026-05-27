import { NextResponse } from "next/server";
import type { BootrisePersonaId } from "@/lib/ai/bootrise-voice";
import { getPersonaSystem } from "@/lib/ai/personas";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import { createProviderChatResponse, isProviderConfigured } from "@/lib/ai/llm-router";
import { resolveUserProvider } from "@/lib/ai/providers";
import { assertModelRouteAllowed, recordModelUsage } from "@/lib/ai/model-router";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import {
  extractGithubRepoUrl,
  inspectGithubRepo,
  shouldInspectGithubRepo
} from "@/lib/workspace/github-inspector";
import {
  buildCodeContextBlock,
  buildCodeReviewSystemPrompt,
  classifyRepoPath,
  formatFilesThinkingDetail,
  isBroadReviewMessage,
  isProductCodeReviewQuestion,
  isRepoOverviewQuestion,
  selectRelevantFiles,
  type LoadedFileSnippet,
  type RepoArea
} from "@/lib/workspace/workspace-code-context";
import { buildRepoOverviewReply } from "@/lib/workspace/repo-overview";
import {
  fromDeterministicFindings,
  mergeReviewFindings,
  formatReviewFindingsBlock
} from "@/lib/workspace/review-findings";
import { buildDeterministicRepoReview } from "@/lib/workspace/deterministic-repo-review";
import { readRepoFiles, repoExists } from "@/lib/workspace/repo-store";
import { runMultiPassCodeReview } from "@/lib/workspace/multi-pass-review";
import { getReviewConfig, shouldUseMultiPassReview } from "@/lib/workspace/review-config";
import { extractPlainEnglishSection } from "@/lib/format-user-message";
import { sanitizeUserFacingText } from "@/lib/ai/bootrise-voice";
import { createWorkspaceChatResponse } from "@/lib/workspace/workspace-chat";
import {
  buildLlmEnhancementPrompt,
  mergeChatResponse,
  shouldEnhanceWithLlm
} from "@/lib/workspace/workspace-chat-wrapper";
import type { ProjectBrief, WorkspaceChatContext, WorkspaceFixReport } from "@/lib/workspace/workspace-types";
import { userApprovedAssumptions } from "@/lib/control/context-gate";
import {
  buildChatRulesBlock,
  runChatControlGate,
  selectChatContextFiles
} from "@/lib/control/chat-control";
import { buildRulesPromptBlock } from "@/lib/control/context-governor";
import { buildEfficientModelContext } from "@/lib/ai/senior-architect";
import type { ContextDepth } from "@/lib/ai/task-intent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WorkspaceChatRequest {
  message?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  projectBrief?: Partial<ProjectBrief>;
  hasCode?: boolean;
  loadedFilePaths?: string[];
  loadedFiles?: LoadedFileSnippet[];
  lastReport?: WorkspaceFixReport | null;
  provider?: "bootrise" | "openai";
  mode?: "fast" | "deep" | "security" | "premium";
  persona?: BootrisePersonaId;
  githubUrl?: string | null;
  githubBranch?: string | null;
  repositoryId?: string | null;
  projectId?: string | null;
  assumptionsApproved?: boolean;
  premiumApproved?: boolean;
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
  const body = (await req.json().catch(() => null)) as WorkspaceChatRequest | null;
  const message = body?.message?.trim();
  const requestedProvider = resolveUserProvider(body?.provider);
  const persona: BootrisePersonaId = body?.persona ?? "architect";

  if (!message) {
    return NextResponse.json({ error: "A non-empty message is required." }, { status: 400 });
  }

  const orgId = ctx.orgId;
  const userId = ctx.user.id;
  const repositoryId = body?.repositoryId?.trim() ?? undefined;
  const loadedFiles = resolveChatFileCorpus(body?.loadedFiles ?? [], repositoryId);
  const resolvedLoadedFilePaths = loadedFiles.length > 0 ? loadedFiles.map((file) => file.path) : body?.loadedFilePaths;
  const projectId = body?.projectId?.trim() ?? repositoryId;
  const projectIdForUsage = projectId ?? "workspace-chat";

  let chatControl: Awaited<ReturnType<typeof runChatControlGate>> | null = null;
  if (loadedFiles.length > 0) {
    const assumptionsApproved =
      Boolean(body?.assumptionsApproved) || userApprovedAssumptions(message);
    chatControl = await runChatControlGate({
      request: message,
      files: loadedFiles,
      repositoryId,
      projectId,
      orgId,
      assumptionsApproved,
      mode: body?.mode
    });
  }

  const premium = requestedProvider === "openai" || body?.mode === "premium";
  if (premium) {
    try {
      assertKillSwitchAllowed("premium_escalation");
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Premium blocked." },
        { status: 403 }
      );
    }
  }

  let modelRoute: Awaited<ReturnType<typeof assertModelRouteAllowed>>;
  try {
    modelRoute = await assertModelRouteAllowed({
      requestedProvider,
      requestedMode: body?.mode,
      taskType: isProductCodeReviewQuestion(message) ? "code_review" : "chat",
      requestText: message,
      filePaths: resolvedLoadedFilePaths,
      fileCount: resolvedLoadedFilePaths?.length ?? loadedFiles.length,
      contextChars: chatControl?.contextPlan.estimatedChars,
      failedAttempts: chatControl?.failedPatchAttempts,
      premiumApproved: Boolean(body?.premiumApproved),
      orgId,
      userId,
      projectId: projectIdForUsage
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Model route blocked.", provider: requestedProvider },
      { status: 403 }
    );
  }
  const provider = modelRoute.provider;
  const providerConfigured = isProviderConfigured(provider);
  const providerSetupHint =
    provider === "openai"
      ? "Add OPENAI_API_KEY to .env.local and restart npm run dev."
      : "Add NVIDIA_API_KEY to .env.local (https://build.nvidia.com) and restart npm run dev, or switch engine to ChatGPT.";

  const context: WorkspaceChatContext = {
    projectBrief: body?.projectBrief as ProjectBrief | undefined,
    hasCode: body?.hasCode || loadedFiles.length > 0,
    loadedFilePaths: resolvedLoadedFilePaths,
    lastReport: body?.lastReport ?? null,
    githubUrl: body?.githubUrl ?? extractGithubRepoUrl(message) ?? null,
    githubBranch: body?.githubBranch ?? null
  };

  if (chatControl && !chatControl.canProceed) {
      const budgetOnly =
        chatControl.stopReason?.includes("Context budget exceeded") &&
        loadedFiles.length > 0 &&
        isProductCodeReviewQuestion(message);

      if (budgetOnly) {
        const review = runFastRepoReview({
          message,
          files: loadedFiles,
          productName: context.projectBrief?.productName,
          chatControl
        });
        void recordModelUsage(modelRoute, { orgId, userId, projectId: projectIdForUsage }, "succeeded");
        return NextResponse.json({
          product: "BootRise",
          provider,
          connected: isProviderConfigured(provider),
          model: "BootRise Fast",
          setupHint: providerConfigured ? undefined : providerSetupHint,
          chatControl,
          ...review.result,
          reply: `${chatControl.stopReason}\n\n${review.result.reply}`,
          suggestedActions: [
            "Run Fix on one finding",
            "Narrow to app/mobile or app/backend for a deeper model pass",
            'Reply "proceed with assumptions" for a scoped fix'
          ]
        });
      }

      void recordModelUsage(modelRoute, { orgId, userId, projectId: projectIdForUsage }, "succeeded");
      const questions = chatControl.contextGate.questions;
      return NextResponse.json({
        product: "BootRise",
        provider,
        connected: isProviderConfigured(provider),
        reply: [
          chatControl.stopReason ?? "BootRise stopped this chat turn to protect your credits and scope.",
          questions.length
            ? `Clarifications needed:\n${questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n")}`
            : null
        ]
          .filter(Boolean)
          .join("\n\n"),
        phase: "planning" as const,
        discoveryQuestions: questions.map((q) => ({
          id: q.id,
          prompt: q.question,
          whyItMatters: q.whyItMatters
        })),
        featureAdvice: [],
        suggestedActions: [
          questions.length ? "Answer the context questions above" : null,
          'Reply "proceed with assumptions" to continue under scope lock',
          "Run Fix with a file-specific request"
        ].filter((s): s is string => Boolean(s)),
        thinkingSteps: [
          {
            id: "control",
            label: "Context Gate",
            status: "done" as const,
            detail: `${Math.round(chatControl.contextGate.confidence * 100)}% confidence`
          },
          {
            id: "lead",
            label: "Lead Architect",
            status: "done" as const,
            detail: "Questions required before patching"
          }
        ],
        fileActivity: [],
        chatControl
      });
  }

  if (loadedFiles.length > 0 && isRepoOverviewQuestion(message)) {
    const overview = buildRepoOverviewReply({
      message,
      files: loadedFiles,
      productName: context.projectBrief?.productName
    });
    void recordModelUsage(modelRoute, { orgId, userId, projectId: projectIdForUsage }, "succeeded");
    return NextResponse.json({
      product: "BootRise",
      provider,
      connected: providerConfigured,
      model: "BootRise Architect",
      setupHint: providerConfigured ? undefined : providerSetupHint,
      chatControl,
      reply: overview.reply,
      plainEnglishSummary: overview.reply.split("\n\n")[0]?.replace(/^WHAT THIS IS:\s*/i, "").trim(),
      phase: "discovery" as const,
      discoveryQuestions: [],
      featureAdvice: [],
      suggestedActions: [
        "Ask about one subsystem (navigation, offers, Orion, backend API)",
        "Open Project Brain to save product rules",
        "Run Fix with a single scoped change when ready to edit code"
      ],
      thinkingSteps: [
        {
          id: "control",
          label: "Senior architect overview",
          status: "done" as const,
          detail: overview.coverageSummary
        },
        {
          id: "docs",
          label: "Read product docs",
          status: "done" as const,
          detail: formatFilesThinkingDetail(overview.overviewFiles)
        }
      ],
      fileActivity: overview.overviewFiles.slice(0, 12).map((f) => ({
        path: f.path,
        status: "analyzing" as const,
        detail: "Product & architecture context"
      })),
      reviewCoverage: overview.coverageSummary
    });
  }

  if (loadedFiles.length > 0 && isProjectWorkRequest(message)) {
    const handoff = buildArchitectureGuideHandoff({
      message,
      files: loadedFiles,
      productName: context.projectBrief?.productName,
      chatControl,
      shouldAutoRun: shouldAutoRunFixFromChat(message)
    });
    void recordModelUsage(modelRoute, { orgId, userId, projectId: projectIdForUsage }, "succeeded");
    return NextResponse.json({
      product: "BootRise",
      provider,
      connected: providerConfigured,
      model: "BootRise Control",
      setupHint: providerConfigured ? undefined : providerSetupHint,
      chatControl,
      ...handoff
    });
  }

  if (loadedFiles.length > 0 && isProductCodeReviewQuestion(message)) {
    if (!providerConfigured || shouldUseFastRepoReview(message, body?.mode, loadedFiles.length)) {
      const review = runFastRepoReview({
        message,
        files: loadedFiles,
        productName: context.projectBrief?.productName,
        chatControl
      });
      void recordModelUsage(modelRoute, { orgId, userId, projectId: projectIdForUsage }, "succeeded");
      return NextResponse.json({
        product: "BootRise",
        provider,
        connected: providerConfigured,
        model: providerConfigured ? "BootRise Fast" : "BootRise offline review",
        setupHint: providerConfigured ? undefined : providerSetupHint,
        chatControl: review.chatControl ?? chatControl,
        ...review.result
      });
    }

    try {
      assertKillSwitchAllowed("expensive_model");
      const review = await runPrimaryCodeReview({
        message,
        history: body?.history ?? [],
        files: loadedFiles,
        productName: context.projectBrief?.productName,
        provider,
        persona,
        chatControl,
        projectId,
        orgId,
        mode: body?.mode
      });
      void recordModelUsage(modelRoute, { orgId, userId, projectId: projectIdForUsage }, "succeeded");
      return NextResponse.json({
        product: "BootRise",
        provider,
        connected: true,
        model: provider === "openai" ? "ChatGPT" : "BootRise",
        chatControl: review.chatControl ?? chatControl,
        ...review.result
      });
    } catch (error) {
      void recordModelUsage(
        modelRoute,
        { orgId, userId, projectId: projectIdForUsage },
        "failed",
        error instanceof Error ? error.message : "Code review failed."
      );
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Code review failed.",
          hint: provider === "openai" ? "Check the ChatGPT runtime key and try again." : "Check the BootRise runtime key and try again."
        },
        { status: 502 }
      );
    }
  }

  let githubReview;
  const githubUrl = extractGithubRepoUrl(message) ?? body?.githubUrl ?? null;
  if (githubUrl && shouldInspectGithubRepo(message)) {
    githubReview = await inspectGithubRepo(githubUrl);
  }

  const base = createWorkspaceChatResponse(message, context, { githubReview });

  let merged = base;
  const shouldUseSelectedEngine =
    providerConfigured && (Boolean(githubReview) || shouldEnhanceWithLlm(base));
  if (shouldUseSelectedEngine) {
    try {
      assertKillSwitchAllowed("expensive_model");
      const rulesBlock =
        loadedFiles.length > 0
          ? await buildChatRulesBlock({ files: loadedFiles, projectId, orgId, request: message })
          : "";
      const result = await createProviderChatResponse({
        provider,
        message: buildLlmEnhancementPrompt({ message, result: base, githubReview }),
        history: body?.history?.slice(-6) ?? [],
        system: getPersonaSystem(persona) + buildRulesPromptBlock(rulesBlock)
      });
      merged = mergeChatResponse(base, result.text, { provider: result.provider, model: result.model });
      void recordModelUsage(modelRoute, { orgId, userId, projectId: projectIdForUsage }, "succeeded");
    } catch (error) {
      void recordModelUsage(
        modelRoute,
        { orgId, userId, projectId: projectIdForUsage },
        "failed",
        error instanceof Error ? error.message : "Selected engine failed to respond."
      );
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Selected engine failed to respond.",
          provider,
          connected: false,
          setupHint: providerSetupHint
        },
        { status: 502 }
      );
    }
  } else {
    merged = mergeChatResponse(base, null);
    if (!providerConfigured && shouldEnhanceWithLlm(base)) {
      merged.reply = `${merged.reply}\n\n**Tip:** ${providerSetupHint}`;
    }
    void recordModelUsage(modelRoute, { orgId, userId, projectId: projectIdForUsage }, "succeeded");
  }

  return NextResponse.json({
    product: "BootRise",
    provider,
    connected: providerConfigured,
    model: providerConfigured ? (provider === "openai" ? "ChatGPT" : "BootRise") : "BootRise (offline)",
    setupHint: providerConfigured ? undefined : providerSetupHint,
    modelRoute,
    chatControl,
    ...merged
  });
  });
}

function resolveChatFileCorpus(clientFiles: LoadedFileSnippet[], repositoryId?: string | null): LoadedFileSnippet[] {
  const id = repositoryId?.trim();
  if (id && repoExists(id)) {
    const disk = readRepoFiles(id);
    if (disk.length > 0) {
      return disk.map((file) => ({
        path: file.path,
        content: file.content
      }));
    }
  }
  return clientFiles;
}

function buildStructuredReviewFindings(
  message: string,
  files: LoadedFileSnippet[],
  productName?: string
) {
  const fast = buildDeterministicRepoReview({
    message,
    files,
    projectName: productName
  });
  return mergeReviewFindings(fromDeterministicFindings(fast.findings));
}

async function runPrimaryCodeReview(input: {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  files: LoadedFileSnippet[];
  productName?: string;
  provider: "bootrise" | "openai";
  persona: BootrisePersonaId;
  chatControl: Awaited<ReturnType<typeof runChatControlGate>> | null;
  projectId?: string;
  orgId?: string;
  mode?: "fast" | "deep" | "security" | "premium";
}) {
  const config = getReviewConfig();
  const rulesBlock = await buildChatRulesBlock({
    files: input.files,
    projectId: input.projectId,
    orgId: input.orgId,
    request: input.message
  });
  const rulesSuffix = buildRulesPromptBlock(rulesBlock);

  if (shouldUseMultiPassReview(input.files.length, input.message, config)) {
    const multi = await runMultiPassCodeReview({
      ...input,
      rulesBlock: rulesSuffix
    });
    const plainEnglishSummary = extractPlainEnglishSection(multi.reply) ?? undefined;
    const reviewFindings = buildStructuredReviewFindings(input.message, input.files, input.productName);
    const findingsBlock = formatReviewFindingsBlock(reviewFindings, 6);
    const reply =
      findingsBlock && !multi.reply.includes("PRIORITIZED FINDINGS")
        ? `${normalizeAgentReply(multi.reply)}\n\n${findingsBlock}`
        : normalizeAgentReply(multi.reply);

    return {
      model: multi.model,
      chatControl: input.chatControl,
      result: {
        reply,
        plainEnglishSummary: plainEnglishSummary ? sanitizeUserFacingText(plainEnglishSummary, 1200) : undefined,
        phase: "review" as const,
        discoveryQuestions: [],
        featureAdvice: [],
        suggestedActions: [
          "Run Fix and report on a specific change",
          `Deep-read ${multi.deepReadFiles.length} files in ${multi.batchCount} passes — ask about a module for more depth`,
          "Export bundle"
        ],
        thinkingSteps: [
          {
            id: "control",
            label: "Chat control layer",
            status: "done" as const,
            detail: input.chatControl?.tokenWaste.message ?? "Context governed"
          },
          ...multi.thinkingSteps
        ],
        fileActivity: multi.deepReadFiles.slice(0, 24).map((f) => ({
          path: f.path,
          status: "analyzing" as const,
          detail: multi.coverageSummary
        })),
        reviewCoverage: multi.coverageSummary,
        reviewFindings
      }
    };
  }

  const depth = (input.chatControl?.taskIntent?.depth ?? "standard") as ContextDepth;
  const efficient = input.chatControl
    ? buildEfficientModelContext(input.files, input.chatControl.contextPlan, depth)
    : null;
  const relevant = input.chatControl
    ? selectChatContextFiles(input.files, input.chatControl.contextPlan)
    : input.files.slice(0, config.singleMaxFiles);

  const contextBlock =
    efficient?.block ||
    buildCodeContextBlock(relevant, {
      maxCharsPerFile: config.charsPerFile,
      totalBudget: config.singleCharBudget
    });
  const architectBlock =
    input.chatControl?.architectBriefPreview && input.chatControl.taskIntent?.seniorArchitectMode
      ? `\n\n${input.chatControl.architectBriefPreview}\n`
      : "";
  const system = buildCodeReviewSystemPrompt(input.productName, input.persona) + architectBlock + rulesSuffix;
  const userPrompt = [
    `User question: ${input.message}`,
    "",
    input.chatControl
      ? [
          `BootRise context: ${input.chatControl.contextPlan.summary}`,
          input.chatControl.taskIntent ? `Task intent: ${input.chatControl.taskIntent.summary}` : null,
          efficient ? `Excerpts: ${efficient.filesIncluded} files (~${Math.round(efficient.charsUsed / 1000)}k chars)` : null
        ]
          .filter(Boolean)
          .join("\n")
      : null,
    "",
    `Relevant source files (${efficient?.filesIncluded ?? relevant.length} of ${input.files.length} in corpus — governed by control layer):`,
    contextBlock || "(no excerpts — ask user to re-import)",
    "",
    "Answer the user question directly. Use clear language throughout. Do not include a heading named Plain English."
  ]
    .filter(Boolean)
    .join("\n");

  const result = await createProviderChatResponse({
    provider: input.provider,
    message: userPrompt,
    history: input.history.slice(-6),
    system
  });

  const normalizedText = normalizeAgentReply(result.text);
  const reviewFindings = buildStructuredReviewFindings(input.message, input.files, input.productName);
  const findingsBlock = formatReviewFindingsBlock(reviewFindings, 6);
  const reply =
    findingsBlock && !normalizedText.includes("PRIORITIZED FINDINGS")
      ? `${normalizedText}\n\n${findingsBlock}`
      : normalizedText;
  const plainMatch = normalizedText.match(/##\s*Summary\s*([\s\S]*?)(?=##\s*Suggested|$)/i);
  const plainEnglishSummary = plainMatch?.[1]?.trim() ?? extractPlainEnglishSection(result.text) ?? undefined;

  const fileActivity = relevant.map((f) => ({
    path: f.path,
    status: "analyzing" as const,
    detail: "Governed context — reviewed for this answer"
  }));

  return {
    model: result.model,
    chatControl: input.chatControl,
    result: {
      reply,
      plainEnglishSummary: plainEnglishSummary ? sanitizeUserFacingText(plainEnglishSummary, 1200) : undefined,
      phase: "review" as const,
      discoveryQuestions: [],
      featureAdvice: [],
      suggestedActions: [
        "Run Fix on one finding",
        "Re-import full repo if navigation files are missing",
        "Export bundle"
      ],
      thinkingSteps: [
        {
          id: "control",
          label: "Chat control layer",
          status: "done" as const,
          detail: input.chatControl?.tokenWaste.message ?? "Context governed"
        },
        { id: "intent", label: "Understand request", status: "done" as const, detail: input.message.slice(0, 72) },
        {
          id: "files",
          label: "Read governed source",
          status: "done" as const,
          detail: formatFilesThinkingDetail(relevant)
        },
        {
          id: "llm",
          label: input.provider === "openai" ? "ChatGPT code review" : "BootRise code review",
          status: "done" as const,
          detail: input.provider === "openai" ? "ChatGPT" : "BootRise"
        }
      ],
      fileActivity,
      reviewFindings
    }
  };
}

function shouldUseFastRepoReview(
  message: string,
  mode: WorkspaceChatRequest["mode"],
  fileCount: number
): boolean {
  if (mode === "deep" || mode === "security" || mode === "premium") return false;
  if (!isBroadReviewMessage(message)) return false;
  return fileCount >= 80 || mode === "fast";
}

function isProjectWorkRequest(message: string): boolean {
  const n = message.toLowerCase();
  if (isRepoOverviewQuestion(message)) return false;
  if (isBroadReviewMessage(message) && !/\b(fix|implement|build|update|improve|plan to fix|make it ready)\b/.test(n)) {
    return false;
  }
  return (
    /\b(fix|implement|build|add|update|improve|polish|refactor|make it ready|work on|prepare a plan|plan to fix|ship|upgrade)\b/.test(
      n
    ) || /\b(what should|what can|best (next|case|thing)|where is headed|architecture guide|roadmap)\b/.test(n)
  );
}

function shouldAutoRunFixFromChat(message: string): boolean {
  const n = message.toLowerCase();
  if (/\b(plan|prepare|review|audit|list|explain|how would)\b/.test(n)) return false;
  return /\b(fix|make it ready|go ahead|work on|update|improve)\b/.test(n);
}

function buildArchitectureGuideHandoff(input: {
  message: string;
  files: LoadedFileSnippet[];
  productName?: string;
  chatControl: Awaited<ReturnType<typeof runChatControlGate>> | null;
  shouldAutoRun: boolean;
}) {
  const focus = inferArchitectureFocus(input.message, input.files);
  const targets = selectWorkTargetFiles(input.message, input.files, focus);
  const targetList = targets.slice(0, 8);
  const projectName = input.productName?.trim() || "this project";
  const fixRequest = [
    `User request: ${input.message.trim()}`,
    `Architecture focus: ${focus.label}.`,
    targetList.length ? `Start with these files: ${targetList.join(", ")}.` : "Start by selecting the smallest relevant source files.",
    "Keep the patch scoped, preserve existing product behavior, and do not touch auth, billing, env files, migrations, or unrelated surfaces without explicit approval.",
    "Return a patch plan, diff preview, risk notes, and verification commands."
  ].join(" ");

  const reply = [
    "ARCHITECTURE GUIDE HANDOFF",
    "",
    `I will treat this as scoped architecture work for ${projectName}, not another broad repo review.`,
    "",
    `Best path: ${focus.label}`,
    focus.guidance,
    "",
    "How BootRise will move:",
    "1. Confirm the smallest valuable outcome for the user.",
    "2. Lock the impacted files and protect forbidden zones.",
    "3. Propose or run the controlled Fix pipeline only after approval or clear fix wording.",
    "4. Verify with the most local checks for the touched app area.",
    "5. Keep the chat output concise: plan, files, diff, risks, next action.",
    "",
    "Likely files:",
    ...(targetList.length ? targetList.map((path) => `- ${path}`) : ["- No exact files selected yet; BootRise will ask for scope before editing."]),
    "",
    "Recommended build cases:",
    ...focus.buildCases.map((item) => `- ${item}`),
    "",
    input.shouldAutoRun
      ? "I am starting the controlled Fix pipeline now because your wording clearly asks BootRise to make the change."
      : "I prepared the scoped Fix request. Use the action below when you approve BootRise to work on the files."
  ].join("\n");

  return {
    reply,
    phase: input.shouldAutoRun ? ("building" as const) : ("planning" as const),
    discoveryQuestions: [],
    featureAdvice: [],
    suggestedActions: input.shouldAutoRun
      ? ["Review proposed patches", "Open Fix panel", "Run sandbox verify after approval"]
      : ["Approve and run scoped fix", "Open Fix panel", "Switch to Deep for more reasoning"],
    thinkingSteps: [
      {
        id: "intent",
        label: "Detect project work intent",
        status: "done" as const,
        detail: input.message.slice(0, 90)
      },
      {
        id: "scope",
        label: "Pick architecture focus",
        status: "done" as const,
        detail: focus.label
      },
      {
        id: "handoff",
        label: input.shouldAutoRun ? "Start Fix pipeline" : "Prepare approval handoff",
        status: input.shouldAutoRun ? ("active" as const) : ("done" as const),
        detail: input.shouldAutoRun ? "Auto-run requested by user wording" : "Waiting for user approval"
      }
    ],
    fileActivity: targets.slice(0, 12).map((path) => ({
      path,
      status: "planned" as const,
      detail: `${focus.label} candidate`
    })),
    fixRequest,
    triggerFix: input.shouldAutoRun,
    reviewCoverage: input.chatControl?.contextPlan.summary
  };
}

type ArchitectureFocus = {
  label: string;
  area: RepoArea | "cross-app";
  query: string;
  guidance: string;
  buildCases: string[];
  preferredPaths: string[];
};

function inferArchitectureFocus(message: string, files: LoadedFileSnippet[]): ArchitectureFocus {
  const n = message.toLowerCase();
  const matches = ARCHITECTURE_FOCUSES.find((focus) => focus.patterns.some((pattern) => pattern.test(n)));
  if (matches) return matches;

  const selected = selectRelevantFiles(message, files, 10);
  const areaCounts = selected.reduce<Record<RepoArea, number>>((acc, file) => {
    const area = classifyRepoPath(file.path);
    acc[area] = (acc[area] ?? 0) + 1;
    return acc;
  }, {} as Record<RepoArea, number>);
  const topArea = (Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as RepoArea | undefined) ?? "other";
  return AREA_FALLBACK_FOCUSES[topArea] ?? AREA_FALLBACK_FOCUSES.other;
}

function selectWorkTargetFiles(message: string, files: LoadedFileSnippet[], focus: ArchitectureFocus): string[] {
  const byPath = new Set(files.map((f) => f.path));
  const matched = focus.preferredPaths.filter((path) => byPath.has(path));
  if (matched.length >= 4) return matched;
  const fallback = selectRelevantFiles(`${message} ${focus.query}`, files, 12).map((f) => f.path);
  return Array.from(new Set([...matched, ...fallback]));
}

const ARCHITECTURE_FOCUSES: Array<ArchitectureFocus & { patterns: RegExp[] }> = [
  {
    label: "Mobile navigation and map experience",
    area: "mobile",
    patterns: [/\b(hud|navigation|nav hud|turn card|lane guidance|maneuver|eta strip|mapbox|route|reroute|driving mode)\b/],
    query: "mobile navigation hud map screen route eta lane guidance turn card",
    guidance: "Prioritize driver safety, glanceability, route truth, and Mapbox/native constraints before visual polish.",
    buildCases: [
      "Fix active trip HUD readability before adding new map features.",
      "Separate debug/developer state from driver-facing navigation state.",
      "Use narrow mobile checks because navigation touches many shared components."
    ],
    preferredPaths: [
      "app/mobile/src/screens/MapScreen.tsx",
      "app/mobile/src/components/navigation/TurnCard.tsx",
      "app/mobile/src/components/navigation/TurnInstructionCard.tsx",
      "app/mobile/src/components/navigation/LaneGuidance.tsx",
      "app/mobile/src/components/navigation/LaneGuidanceBar.tsx",
      "app/mobile/src/components/navigation/NavigationStatusStrip.tsx",
      "app/mobile/src/navigation/navBannerFromStep.ts"
    ]
  },
  {
    label: "Backend API and data ownership",
    area: "backend",
    patterns: [/\b(backend|api|fastapi|endpoint|route|admin route|server|database|db|ownership|rls)\b/],
    query: "backend api route auth ownership service tests",
    guidance: "Start with route ownership, auth behavior, response shape, and rollback risk before changing business logic.",
    buildCases: [
      "Add or tighten route-level auth and smoke coverage around high-risk endpoints.",
      "Keep schema and migration work separate unless the user explicitly approves it.",
      "Verify with focused backend tests before broader app checks."
    ],
    preferredPaths: [
      "app/backend/main.py",
      "app/backend/middleware/auth.py",
      "app/backend/routes/admin.py",
      "app/backend/routes/admin_metrics.py",
      "app/backend/routes/navigation.py",
      "app/backend/routes/places.py"
    ]
  },
  {
    label: "Frontend driver portal",
    area: "frontend",
    patterns: [/\b(frontend|web|driver portal|driver app|vite|dashboard|landing|react web)\b/],
    query: "frontend driver app portal react components",
    guidance: "Align web behavior with the mobile product surface while keeping shared concepts consistent.",
    buildCases: [
      "Consolidate duplicated product affordances across web and mobile.",
      "Improve one user flow at a time before redesigning whole pages.",
      "Run frontend build or lint after UI changes."
    ],
    preferredPaths: [
      "app/frontend/src/App.jsx",
      "app/frontend/src/pages/DriverApp/DriverApp.jsx",
      "app/frontend/src/pages/DriverApp/components/BadgesGrid.tsx",
      "app/frontend/src/pages/DriverApp/components/CarOnboarding.tsx"
    ]
  },
  {
    label: "Security, auth, and payments",
    area: "backend",
    patterns: [/\b(security|auth|login|jwt|payment|stripe|webhook|secret|admin|billing)\b/],
    query: "security auth payment webhook admin middleware tests",
    guidance: "Treat this as expanded-approval work: prove ownership, secret handling, and rollback before editing.",
    buildCases: [
      "Review findings first, then patch the smallest exploitable issue.",
      "Avoid changing env, migrations, or payment behavior without explicit approval.",
      "Run security and backend auth tests after any patch."
    ],
    preferredPaths: [
      "app/backend/middleware/auth.py",
      "app/backend/routes/admin.py",
      "app/backend/routes/auth.py",
      "app/backend/routes/stripe.py",
      "app/backend/webhooks.py"
    ]
  },
  {
    label: "Verification and deployment readiness",
    area: "tests",
    patterns: [/\b(test|tests|ci|build|deploy|verification|sandbox|safe to pr|safe to deploy|eas|release)\b/],
    query: "tests ci build deploy verification package workflow",
    guidance: "Map checks to touched surfaces instead of relying on one root command for a monorepo.",
    buildCases: [
      "Add per-app verification commands for backend, frontend, and mobile.",
      "Make Safe to PR reflect actual commands and known skipped checks.",
      "Keep release or EAS changes behind the existing wrapper rules."
    ],
    preferredPaths: [
      ".github/workflows/eas-update.yml",
      ".github/workflows/loadtest-k6.yml",
      "app/backend/pytest.ini",
      "app/frontend/package.json",
      "app/mobile/package.json"
    ]
  }
];

const AREA_FALLBACK_FOCUSES: Record<RepoArea, ArchitectureFocus> = {
  mobile: ARCHITECTURE_FOCUSES[0],
  backend: ARCHITECTURE_FOCUSES[1],
  frontend: ARCHITECTURE_FOCUSES[2],
  tests: ARCHITECTURE_FOCUSES[4],
  docs: {
    label: "Project brain and durable architecture guidance",
    area: "docs",
    query: "docs runbook architecture agents project brain",
    guidance: "Turn durable architecture decisions into reusable project guidance so BootRise does not rediscover them every turn.",
    buildCases: [
      "Promote stable runbook rules into project memory.",
      "Keep generated planning separate from source documentation.",
      "Use docs to guide future fix scope, not to bypass patch review."
    ],
    preferredPaths: ["AGENTS.md", "README.md", "app/backend/README.md", "app/docs/LAUNCH_READINESS_RUNBOOK.md"]
  },
  config: ARCHITECTURE_FOCUSES[4],
  other: {
    label: "Cross-app architecture planning",
    area: "cross-app",
    query: "architecture product workflow source files",
    guidance: "Start with the smallest product outcome, then let Project Brain choose files by module and blast radius.",
    buildCases: [
      "Ask one clarifying question if the requested outcome is not testable.",
      "Prefer a scoped Fix run over a broad rewrite.",
      "Use Project Brain and review findings to recommend the next highest-value build step."
    ],
    preferredPaths: ["AGENTS.md", "README.md"]
  }
};

function runFastRepoReview(input: {
  message: string;
  files: LoadedFileSnippet[];
  productName?: string;
  chatControl: Awaited<ReturnType<typeof runChatControlGate>> | null;
}) {
  const fast = buildDeterministicRepoReview({
    message: input.message,
    files: input.files,
    projectName: input.productName
  });
  const reviewFindings = mergeReviewFindings(fromDeterministicFindings(fast.findings));
  const findingsBlock = formatReviewFindingsBlock(reviewFindings, 6);
  const reply = findingsBlock ? `${fast.reply}\n\n${findingsBlock}` : fast.reply;

  return {
    model: "BootRise Fast",
    chatControl: input.chatControl,
    result: {
      reply,
      phase: "review" as const,
      discoveryQuestions: [],
      featureAdvice: [],
      suggestedActions: [
        "Run Fix on one finding",
        "Switch to Deep for model-backed review",
        "Open Project Brain"
      ],
      thinkingSteps: [
        {
          id: "control",
          label: "Chat control layer",
          status: "done" as const,
          detail: input.chatControl?.tokenWaste.message ?? "Context governed"
        },
        { id: "intent", label: "Understand request", status: "done" as const, detail: input.message.slice(0, 72) },
        {
          id: "files",
          label: "Fast repo audit",
          status: "done" as const,
          detail: formatFilesThinkingDetail(fast.deepReadFiles)
        },
        {
          id: "brain",
          label: "Use Project Brain index",
          status: "done" as const,
          detail: fast.coverageSummary
        }
      ],
      fileActivity: fast.deepReadFiles.slice(0, 24).map((f) => ({
        path: f.path,
        status: "analyzing" as const,
        detail: fast.coverageSummary
      })),
      reviewCoverage: fast.coverageSummary,
      reviewFindings
    }
  };
}

function normalizeAgentReply(reply: string): string {
  const withoutPlainEnglishHeading = reply.replace(/^#+\s*Plain English\s*$/gim, "").replace(/^In plain English\s*$/gim, "");
  const sections = withoutPlainEnglishHeading
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  return sections
    .filter((part) => {
      const key = part.toLowerCase().replace(/\W+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n\n")
    .trim();
}
