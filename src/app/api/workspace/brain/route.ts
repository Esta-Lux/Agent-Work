import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { buildProjectBrainSummary } from "@/lib/project-brain/project-brain-summary";
import { listMemoryItems } from "@/lib/project-brain/project-brain-store";
import { listModules } from "@/lib/project-brain/module-indexer";
import { loadFileIndex } from "@/lib/project-brain/file-indexer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const projectId = new URL(req.url).searchParams.get("projectId")?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }

    const summary = await buildProjectBrainSummary(ctx.orgId, projectId);
    const memoryItems = await listMemoryItems(ctx.orgId, projectId);
    const modules = await listModules(ctx.orgId, projectId);
    const files = await loadFileIndex(ctx.orgId, projectId);

    return NextResponse.json({
      product: "BootRise",
      summary,
      memoryItems,
      modules,
      riskyFiles: files.filter((f) => f.riskLevel !== "normal").slice(0, 30)
    });
  });
}
