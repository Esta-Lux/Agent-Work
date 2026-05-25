import { NextResponse } from "next/server";
import { createOpenAIChatResponse, hasOpenAIKey } from "@/lib/ai/openai-client";
import { extractGithubRepoUrl, inspectGithubRepo, isGithubReviewIntent } from "@/lib/workspace/github-inspector";
import { createWorkspaceChatResponse } from "@/lib/workspace/workspace-chat";
import type { ProjectBrief, WorkspaceChatContext, WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export const runtime = "nodejs";

interface WorkspaceChatRequest {
  message?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  projectBrief?: Partial<ProjectBrief>;
  hasCode?: boolean;
  loadedFilePaths?: string[];
  lastReport?: WorkspaceFixReport | null;
  useOpenAI?: boolean;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as WorkspaceChatRequest | null;
  const message = body?.message?.trim();

  if (!message) {
    return NextResponse.json({ error: "A non-empty message is required." }, { status: 400 });
  }

  const context: WorkspaceChatContext = {
    projectBrief: body?.projectBrief as ProjectBrief | undefined,
    hasCode: body?.hasCode,
    loadedFilePaths: body?.loadedFilePaths,
    lastReport: body?.lastReport ?? null
  };

  let githubReview;
  const githubUrl = extractGithubRepoUrl(message);
  if (githubUrl && isGithubReviewIntent(message)) {
    githubReview = await inspectGithubRepo(githubUrl);
  }

  const deterministic = createWorkspaceChatResponse(message, context, { githubReview });

  if (body?.useOpenAI && hasOpenAIKey() && !deterministic.triggerFix) {
    try {
      const result = await createOpenAIChatResponse({
        message: `[BootRise user workspace — be specific about files and blast radius]\nBrief: ${JSON.stringify(context.projectBrief ?? {})}\nFiles: ${(context.loadedFilePaths ?? []).join(", ")}\n\n${message}`,
        history: body.history ?? []
      });

      return NextResponse.json({
        product: "BootRise",
        provider: "openai",
        connected: true,
        model: result.model,
        ...deterministic,
        reply: result.text
      });
    } catch (error) {
      return NextResponse.json({
        product: "BootRise",
        provider: "bootrise",
        connected: false,
        ...deterministic,
        message: error instanceof Error ? error.message : "OpenAI unavailable; BootRise engine responded."
      });
    }
  }

  return NextResponse.json({
    product: "BootRise",
    provider: "bootrise",
    connected: true,
    ...deterministic
  });
}
