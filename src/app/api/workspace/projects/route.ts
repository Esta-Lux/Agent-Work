import { NextResponse } from "next/server";
import { getSupabaseHealthReport } from "@/lib/db/supabase-health";
import { getProject, listProjects, saveProject, type WorkspaceProject } from "@/lib/workspace/project-store";
import type { ProjectBrief } from "@/lib/workspace/workspace-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const supabase = await getSupabaseHealthReport();

  if (id) {
    const project = await getProject(id);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json({ product: "BootRise", project, supabase: { schemaReady: supabase.schemaReady } });
  }

  const { projects, storage } = await listProjects();
  return NextResponse.json({
    product: "BootRise",
    projects,
    storage,
    supabase: {
      configured: supabase.configured,
      schemaReady: supabase.schemaReady,
      message: supabase.message
    }
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    id?: string;
    name?: string;
    brief?: ProjectBrief;
    files?: WorkspaceProject["files"];
    lastReport?: WorkspaceProject["lastReport"];
    preferredProvider?: "bootrise" | "openai";
    githubUrl?: string | null;
  } | null;

  if (!body?.name?.trim() || !body.brief?.productName?.trim()) {
    return NextResponse.json({ error: "name and brief.productName are required." }, { status: 400 });
  }

  const { project, storage, cloudSaved } = await saveProject({
    id: body.id,
    name: body.name.trim(),
    brief: body.brief,
    files: body.files,
    lastReport: body.lastReport ?? undefined,
    preferredProvider: body.preferredProvider,
    githubUrl: body.githubUrl ?? null
  });

  const supabase = await getSupabaseHealthReport();

  return NextResponse.json({
    product: "BootRise",
    project,
    storage,
    cloudSaved,
    supabase: {
      schemaReady: supabase.schemaReady,
      message: cloudSaved ? "Saved to Supabase and local backup." : supabase.setupHint ?? supabase.message
    }
  });
}
