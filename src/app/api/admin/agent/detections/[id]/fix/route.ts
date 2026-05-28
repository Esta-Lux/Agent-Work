import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { DEFAULT_ORG_ID } from "@/lib/tenancy/org-context";
import { recordAudit } from "@/lib/admin/audit-log";
import { findDetectionById } from "@/lib/admin/detections/store";
import { detectionToFixRequest } from "@/lib/admin/detections/synthesize-fix";
import { runAdminAgentFix } from "@/lib/admin/admin-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: { params: { id: string } }) {
  return withAdminAuth(request, async (user) => {
    const detection = findDetectionById(ctx.params.id);
    if (!detection) {
      return NextResponse.json({ error: `Detection ${ctx.params.id} not found.` }, { status: 404 });
    }
    try {
      const requestText = detection.suggestedFixRequest ?? detectionToFixRequest(detection);
      const result = await runAdminAgentFix({ user, orgId: DEFAULT_ORG_ID, request: requestText });
      void recordAudit(
        {
          actor: user.id,
          action: "admin_agent.detection_fix",
          detail: `${detection.kind} → ${result.pendingFixId}`,
          metadata: { detectionId: detection.id, kind: detection.kind, pendingFixId: result.pendingFixId }
        },
        DEFAULT_ORG_ID
      );
      return NextResponse.json({
        product: "BootRise",
        pendingFixId: result.pendingFixId,
        report: result.report,
        filesConsidered: result.filesConsidered,
        detectionId: detection.id
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Detection fix failed." },
        { status: 502 }
      );
    }
  });
}
