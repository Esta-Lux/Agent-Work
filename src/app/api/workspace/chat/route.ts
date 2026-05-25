import { NextResponse } from "next/server";
import { createOpenAIChatResponse, hasOpenAIKey } from "@/lib/ai/openai-client";
import {
  createWorkspaceChatResponse,
  type ProjectBrief,
  type WorkspaceChatContext,
  type WorkspaceFixReport
} from "@/lib/workspace/workspace-agent";

export const runtime = "nodejs";

interface WorkspaceChatRequest {
  message?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  projectBrief?: Partial<ProjectBrief>;
  hasCode?: boolean;
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
    lastReport: body?.lastReport ?? null
  };

  const deterministic = createWorkspaceChatResponse(message, context);

  if (body?.useOpenAI && hasOpenAIKey()) {
    try {
      const result = await createOpenAIChatResponse({
        message: `[User workspace — startup bootstrap]\nBrief: ${JSON.stringify(context.projectBrief ?? {})}\n\n${message}`,
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
