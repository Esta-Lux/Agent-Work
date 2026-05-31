import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import {
  listAgentActivityEvents,
  recordAgentActivityEvent,
  type AgentActivityActor,
  type AgentActivityEvent,
  type AgentActivityStatus,
  type AgentEventType
} from "@/lib/workspace/agent-activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
    const projectId = new URL(req.url).searchParams.get("projectId")?.trim();
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
    return NextResponse.json({ product: "BootRise", events: listAgentActivityEvents(projectId) });
  });
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
    const body = (await req.json().catch(() => null)) as Partial<AgentActivityEvent> | null;
    if (!body?.projectId?.trim() || !body.id?.trim() || !body.title?.trim()) {
      return NextResponse.json({ error: "projectId, id, and title required" }, { status: 400 });
    }
    if (!body.actor || !body.type || !body.status) {
      return NextResponse.json({ error: "actor, type, and status required" }, { status: 400 });
    }
    const event = recordAgentActivityEvent({
      id: body.id.trim(),
      projectId: body.projectId.trim(),
      jobId: body.jobId?.trim(),
      runId: body.runId?.trim(),
      workUnitId: body.workUnitId?.trim(),
      actor: body.actor as AgentActivityActor,
      type: body.type as AgentEventType,
      status: body.status as AgentActivityStatus,
      title: body.title.trim(),
      detail: body.detail,
      filePaths: body.filePaths,
      command: body.command,
      exitCode: body.exitCode,
      durationMs: body.durationMs,
      outputPreview: body.outputPreview,
      metadata: body.metadata,
      timestamp: body.timestamp
    });
    return NextResponse.json({ product: "BootRise", event });
  });
}
