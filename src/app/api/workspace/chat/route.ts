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
  formatFilesThinkingDetail,
  isBroadReviewMessage,
  isProductCodeReviewQuestion,
  type LoadedFileSnippet
} from "@/lib/workspace/workspace-code-context";
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
      assumptionsApproved
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
      void recordModelUsage(modelRoute, { orgId, userId, projectId: projectIdForUsage }, "succeeded");
      return NextResponse.json({
        product: "BootRise",
        provider,
        connected: isProviderConfigured(provider),
        reply: chatControl.stopReason ?? "BootRise stopped this chat turn to protect your credits and scope.",
        phase: "planning" as const,
        discoveryQuestions: chatControl.contextGate.questions.map((q) => ({
          id: q.id,
          prompt: q.question,
          whyItMatters: q.whyItMatters
        })),
        featureAdvice: [],
        suggestedActions: [
          "Answer the context questions above",
          'Reply "proceed with assumptions" to continue under scope lock',
          "Run Fix with a file-specific request"
        ],
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

    return {
      model: multi.model,
      chatControl: input.chatControl,
      result: {
        reply: normalizeAgentReply(multi.reply),
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
        reviewCoverage: multi.coverageSummary
      }
    };
  }

  const relevant = input.chatControl
    ? selectChatContextFiles(input.files, input.chatControl.contextPlan)
    : input.files.slice(0, config.singleMaxFiles);

  const contextBlock = buildCodeContextBlock(relevant, {
    maxCharsPerFile: config.charsPerFile,
    totalBudget: config.singleCharBudget
  });
  const system = buildCodeReviewSystemPrompt(input.productName, input.persona) + rulesSuffix;
  const userPrompt = [
    `User question: ${input.message}`,
    "",
    input.chatControl
      ? `BootRise context budget: ${input.chatControl.contextPlan.summary}`
      : null,
    "",
    `Relevant source files (${relevant.length} of ${input.files.length} in corpus — governed by control layer):`,
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
      reply: normalizedText,
      plainEnglishSummary: plainEnglishSummary ? sanitizeUserFacingText(plainEnglishSummary, 1200) : undefined,
      phase: "review" as const,
      discoveryQuestions: [],
      featureAdvice: [],
      suggestedActions: [
        "Run Fix and report on a specific change",
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
      fileActivity
    }
  };
}

function shouldUseFastRepoReview(
  message: string,
  mode: WorkspaceChatRequest["mode"],
  fileCount: number
): boolean {
  if (mode && mode !== "fast") return false;
  return fileCount >= 80 && isBroadReviewMessage(message);
}

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

  return {
    model: "BootRise Fast",
    chatControl: input.chatControl,
    result: {
      reply: fast.reply,
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
      reviewCoverage: fast.coverageSummary
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
