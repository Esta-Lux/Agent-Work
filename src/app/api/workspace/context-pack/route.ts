import { NextResponse } from "next/server";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { buildTaskContextPack, formatContextPackSummary } from "@/lib/control/task-context-pack";
import { userApprovedAssumptions } from "@/lib/control/context-gate";
import { readRepoFiles, repoExists } from "@/lib/workspace/repo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ContextPackRequest {
  request?: string;
  files?: SourceFileInput[];
  repositoryId?: string | null;
  projectId?: string | null;
  assumptionsApproved?: boolean;
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as ContextPackRequest | null;
    const taskRequest = body?.request?.trim();
    if (!taskRequest) {
      return NextResponse.json({ error: "A non-empty task request is required." }, { status: 400 });
    }

    const repositoryId = body?.repositoryId?.trim() || undefined;
    const projectId = body?.projectId?.trim() || repositoryId || "workspace";
    let files = body?.files ?? [];

    if (files.length === 0 && repositoryId && (await repoExists(repositoryId))) {
      files = await readRepoFiles(repositoryId);
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Provide files or import a repository before building a context pack." },
        { status: 400 }
      );
    }

    const assumptionsApproved =
      Boolean(body?.assumptionsApproved) || userApprovedAssumptions(taskRequest);

    const pack = await buildTaskContextPack({
      request: taskRequest,
      files,
      orgId: ctx.orgId,
      projectId,
      repositoryId,
      assumptionsApproved
    });

    return NextResponse.json({
      product: "BootRise",
      pack,
      summary: formatContextPackSummary(pack)
    });
  });
}
