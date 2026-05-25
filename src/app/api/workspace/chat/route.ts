import { NextResponse } from "next/server";
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
  isProductCodeReviewQuestion,
  selectRelevantFiles,
  type LoadedFileSnippet
} from "@/lib/workspace/workspace-code-context";
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
  githubUrl?: string | null;
  githubBranch?: string | null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as WorkspaceChatRequest | null;
  const message = body?.message?.trim();
  const provider = resolveUserProvider(body?.provider);

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

  const loadedFiles = body?.loadedFiles ?? [];

  if (loadedFiles.length > 0 && isProductCodeReviewQuestion(message) && isProviderConfigured(provider)) {
    try {
      const review = await runPrimaryCodeReview({
        message,
        history: body?.history ?? [],
        files: loadedFiles,
        productName: context.projectBrief?.productName,
        provider
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
      const result = await createProviderChatResponse({
        provider,
        message: buildLlmEnhancementPrompt({ message, result: base, githubReview }),
        history: [],
        system: "Reply with only the insight paragraph. No preamble."
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

async function runPrimaryCodeReview(input: {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  files: LoadedFileSnippet[];
  productName?: string;
  provider: "bootrise" | "openai";
}) {
  const relevant = selectRelevantFiles(input.message, input.files);
  const contextBlock = buildCodeContextBlock(relevant);
  const system = buildCodeReviewSystemPrompt(input.productName);
  const userPrompt = [
    `User question: ${input.message}`,
    "",
    `Relevant source files (${relevant.length} of ${input.files.length} loaded):`,
    contextBlock || "(no excerpts — ask user to re-import)",
    "",
    "Answer the user question directly. Include a Plain English section for non-engineers."
  ].join("\n");

  const result = await createProviderChatResponse({
    provider: input.provider,
    message: userPrompt,
    history: input.history.slice(-6),
    system
  });

  const plainMatch = result.text.match(/##\s*Plain English\s*([\s\S]*?)(?=##\s*Suggested|$)/i);
  const plainEnglishSummary = plainMatch?.[1]?.trim() ?? null;

  const fileActivity = relevant.map((f) => ({
    path: f.path,
    status: "analyzing" as const,
    detail: "Reviewed for this answer"
  }));

  return {
    model: result.model,
    result: {
      reply: result.text,
      plainEnglishSummary: plainEnglishSummary ?? undefined,
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
          detail: `${relevant.length} file(s): ${relevant.map((f) => f.path.split("/").pop()).join(", ")}`
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
