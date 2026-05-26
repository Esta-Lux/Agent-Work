import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { approvePendingFix } from "@/lib/workspace/workspace-fix.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      pendingFixId?: string;
      sandboxPassed?: boolean;
    } | null;

    if (!body?.pendingFixId?.trim()) {
      return NextResponse.json({ error: "pendingFixId is required." }, { status: 400 });
    }

    try {
      const result = await approvePendingFix(body.pendingFixId.trim(), {
        sandboxPassed: body.sandboxPassed,
        orgId: ctx.orgId
      });

      return NextResponse.json({
        product: "BootRise",
        phase: 2,
        files: result.files,
        report: result.report,
        previewSessionId: result.previewSessionId,
        previewUrl: result.previewUrl,
        devPreviewStatus: result.devPreviewStatus,
        devPreviewLog: result.devPreviewLog,
        nextAction:
          result.devPreviewStatus === "installing" || result.devPreviewStatus === "starting"
            ? "Dev server is starting — the preview iframe will refresh when ready."
            : "Review the web preview and run sandbox verify for build proof."
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Approval failed." },
        { status: 502 }
      );
    }
  });
}
