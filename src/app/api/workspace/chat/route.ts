import { NextResponse } from "next/server";
import type { BootrisePersonaId } from "@/lib/ai/bootrise-voice";
import { getPersonaSystem } from "@/lib/ai/personas";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import { createProviderChatResponse, isProviderConfigured } from "@/lib/ai/llm-router";
import { resolveUserProvider } from "@/lib/ai/providers";
import {
  extractGithubRepoUrl,
  inspectGithubRepo,
  shouldInspectGithubRepo
} from "@/lib/workspace/github-inspector";
import {
  buildCodeContextBlock,
  buildCodeReviewSystemPrompt,
  formatFilesThinkingDetail,
  isProductCodeReviewQuestion,
  selectRelevantFiles,
  type LoadedFileSnippet
} from "@/lib/workspace/workspace-code-context";
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
  persona?: BootrisePersonaId;
  githubUrl?: string | null;
  githubBranch?: string | null;
  repositoryId?: string | null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as WorkspaceChatRequest | null;
  const message = body?.message?.trim();
  const provider = resolveUserProvider(body?.provider);
  const persona: BootrisePersonaId = body?.persona ?? "architect";

  if (!message) {
    return NextResponse.json({ error: "A non-empty message is required." }, { status: 400 });
  }

  const context: WorkspaceChatContext = {
    projectBrief: body?.projectBrief as ProjectBrief | undefined,
    hasCode: body?.hasCode,
    loadedFilePaths: body?.loadedFilePaths,
    lastReport: body?.lastReport ?? null,
    githubUrl: body?.githubUrl ?? extractGithubRepoUrl(message) ?? null,
    githubBranch: body?.githubBranch ?? null
  };

  const loadedFiles = resolveChatFileCorpus(body?.loadedFiles ?? [], body?.repositoryId);

  if (loadedFiles.length > 0 && isProductCodeReviewQuestion(message) && isProviderConfigured(provider)) {
    try {
      assertKillSwitchAllowed("expensive_model");
      const review = await runPrimaryCodeReview({
        message,
        history: body?.history ?? [],
        files: loadedFiles,
        productName: context.projectBrief?.productName,
        provider,
        persona
      });
      return NextResponse.json({
        product: "BootRise",
        provider,
        connected: true,
        model: review.model,
        ...review.result
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Code review failed.",
          hint: "Try OpenAI provider or re-import the repo."
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
  const skipLlm = Boolean(githubReview) || !shouldEnhanceWithLlm(base);
  if (!skipLlm && isProviderConfigured(provider)) {
    try {
      assertKillSwitchAllowed("expensive_model");
      const result = await createProviderChatResponse({
        provider,
        message: buildLlmEnhancementPrompt({ message, result: base, githubReview }),
        history: [],
        system: getPersonaSystem(persona)
      });
      merged = mergeChatResponse(base, result.text, { provider: result.provider, model: result.model });
    } catch {
      merged = base;
    }
  } else {
    merged = mergeChatResponse(base, null);
  }

  return NextResponse.json({
    product: "BootRise",
    provider,
    connected: isProviderConfigured(provider),
    model: merged.thinkingSteps.find((s) => s.id === "llm")?.detail,
    ...merged
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
}) {
  const config = getReviewConfig();

  if (shouldUseMultiPassReview(input.files.length, input.message, config)) {
    const multi = await runMultiPassCodeReview(input);
    const plainEnglishSummary = extractPlainEnglishSection(multi.reply) ?? undefined;

    return {
      model: multi.model,
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
        thinkingSteps: multi.thinkingSteps,
        fileActivity: multi.deepReadFiles.slice(0, 24).map((f) => ({
          path: f.path,
          status: "analyzing" as const,
          detail: multi.coverageSummary
        })),
        reviewCoverage: multi.coverageSummary
      }
    };
  }

  const relevant = selectRelevantFiles(input.message, input.files, config.singleMaxFiles);
  const contextBlock = buildCodeContextBlock(relevant, {
    maxCharsPerFile: config.charsPerFile,
    totalBudget: config.singleCharBudget
  });
  const system = buildCodeReviewSystemPrompt(input.productName, input.persona);
  const userPrompt = [
    `User question: ${input.message}`,
    "",
    `Relevant source files (${relevant.length} of ${input.files.length} in corpus — production source prioritized over tests unless you asked for tests):`,
    contextBlock || "(no excerpts — ask user to re-import)",
    "",
    "Answer the user question directly. Use clear language throughout. Do not include a heading named Plain English."
  ].join("\n");

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
    detail: "Reviewed for this answer"
  }));

  return {
    model: result.model,
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
        { id: "intent", label: "Understand request", status: "done" as const, detail: input.message.slice(0, 72) },
        {
          id: "files",
          label: "Read relevant source",
          status: "done" as const,
          detail: formatFilesThinkingDetail(relevant)
        },
        {
          id: "llm",
          label: input.provider === "openai" ? "OpenAI code review" : "NVIDIA code review",
          status: "done" as const,
          detail: result.model
        }
      ],
      fileActivity
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
