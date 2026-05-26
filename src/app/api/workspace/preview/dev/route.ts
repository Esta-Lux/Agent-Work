import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { getDevPreviewSession } from "@/lib/workspace/preview-dev-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
  const sessionId = new URL(req.url).searchParams.get("sessionId")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const session = getDevPreviewSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Dev preview session not found." }, { status: 404 });
  }

  return NextResponse.json({
    product: "BootRise",
    session
  });
  });
}
