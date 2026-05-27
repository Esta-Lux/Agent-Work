import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import {
  isSandboxLifecycleEnabled,
  listSandboxSessions
} from "@/lib/sandbox/sandbox-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
    const url = new URL(req.url);
    const repositoryId = url.searchParams.get("repositoryId") ?? undefined;
    const sessions = listSandboxSessions(repositoryId ?? undefined);

    return NextResponse.json({
      product: "BootRise",
      lifecycleEnabled: isSandboxLifecycleEnabled(),
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        repositoryId: s.repositoryId,
        state: s.state,
        workerId: s.workerId,
        toolCalls: s.toolCalls,
        lastError: s.lastError,
        isolation: s.isolation
      }))
    });
  });
}
