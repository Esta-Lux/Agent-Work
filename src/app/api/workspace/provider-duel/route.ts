import { NextResponse } from "next/server";
import { runProviderDuel } from "@/lib/ai/provider-duel";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
    const body = (await req.json().catch(() => null)) as { task?: string; files?: SourceFileInput[]; premiumAllowed?: boolean } | null;
    if (!body?.task?.trim()) return NextResponse.json({ error: "task is required." }, { status: 400 });
    const result = await runProviderDuel({
      task: body.task,
      files: body.files ?? [],
      premiumAllowed: body.premiumAllowed
    });
    return NextResponse.json(result);
  });
}
