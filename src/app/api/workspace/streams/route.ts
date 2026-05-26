import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/admin/audit-log";
import { resolveOrgId } from "@/lib/tenancy/org-context";
import { listDeviceStreams, provisionDeviceStream } from "@/lib/workspace/device-stream-service";
import { appendLedgerEvent } from "@/lib/workspace/living-ledger-timeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const repositoryId = new URL(request.url).searchParams.get("repositoryId")?.trim();
  if (!repositoryId) {
    return NextResponse.json({ error: "repositoryId is required." }, { status: 400 });
  }

  const streams = await listDeviceStreams(repositoryId);
  return NextResponse.json({ product: "BootRise", streams });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    repositoryId?: string;
    runtime?: "android" | "ios";
    transport?: "webrtc" | "novnc";
    projectId?: string;
  } | null;

  if (!body?.repositoryId?.trim()) {
    return NextResponse.json({ error: "repositoryId is required." }, { status: 400 });
  }

  const runtime = body.runtime ?? "android";
  const orgId = resolveOrgId(request);

  try {
    const stream = await provisionDeviceStream({
      repositoryId: body.repositoryId.trim(),
      runtime,
      transport: body.transport
    });

    void recordAudit(
      { actor: "workspace-user", action: "device_stream_provision", detail: `${runtime}:${stream.id}` },
      orgId
    );

    if (body.projectId) {
      void appendLedgerEvent(
        body.projectId,
        {
          kind: "stream",
          title: `${runtime} stream provisioned`,
          narrative: `BootRise registered a ${runtime} device farm stream (${stream.transport}) for repository ${body.repositoryId}. Open the stream panel to view WebRTC or noVNC output when URLs are configured.`
        },
        orgId
      );
    }

    return NextResponse.json({ product: "BootRise", stream });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stream provision failed." },
      { status: 502 }
    );
  }
}
