import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { getSupabaseHealthReport } from "@/lib/db/supabase-health";
import { getProject, listProjects, saveProject, type WorkspaceProject } from "@/lib/workspace/project-store";
import type { ProjectBrief } from "@/lib/workspace/workspace-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function scopeFromCtx(ctx: { orgId: string; user: { id: string } }) {
  return { orgId: ctx.orgId, userId: ctx.user.id };
}

export async function GET(request: Request) {
  return withWorkspaceAuth(request, async (ctx) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const supabase = await getSupabaseHealthReport();
    const scope = scopeFromCtx(ctx);

    if (id) {
      const project = await getProject(id, scope);
      if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
      return NextResponse.json({ product: "BootRise", project, supabase: { schemaReady: supabase.schemaReady } });
    }

    const { projects, storage } = await listProjects(scope);
    return NextResponse.json({
      product: "BootRise",
      projects,
      storage,
      orgId: ctx.orgId,
      supabase: {
        configured: supabase.configured,
        schemaReady: supabase.schemaReady,
        message: supabase.message
      }
    });
  });
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      id?: string;
      name?: string;
      brief?: ProjectBrief;
      files?: WorkspaceProject["files"];
      lastReport?: WorkspaceProject["lastReport"];
      preferredProvider?: "bootrise" | "openai";
      githubUrl?: string | null;
      repositoryId?: string | null;
    } | null;

    if (!body?.name?.trim() || !body.brief?.productName?.trim()) {
      return NextResponse.json({ error: "name and brief.productName are required." }, { status: 400 });
    }

    const scope = scopeFromCtx(ctx);
    const { project, storage, cloudSaved } = await saveProject(
      {
        id: body.id,
        name: body.name.trim(),
        brief: body.brief,
        files: body.files,
        lastReport: body.lastReport ?? undefined,
        preferredProvider: body.preferredProvider,
        githubUrl: body.githubUrl ?? null,
        repositoryId: body.repositoryId ?? null
      },
      scope
    );

    const supabase = await getSupabaseHealthReport();

    return NextResponse.json({
      product: "BootRise",
      project,
      storage,
      cloudSaved,
      orgId: ctx.orgId,
      supabase: {
        schemaReady: supabase.schemaReady,
        message: cloudSaved ? "Saved to Supabase and local backup." : supabase.setupHint ?? supabase.message
      }
    });
  });
}
