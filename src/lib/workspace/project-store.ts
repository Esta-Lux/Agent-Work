import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { BOOTRISE_CORE_TABLES } from "@/lib/db/supabase-health";
import type { ProjectBrief, WorkspaceFixReport } from "@/lib/workspace/workspace-types";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export interface WorkspaceProject {
  id: string;
  name: string;
  brief: ProjectBrief;
  files: SourceFileInput[];
  lastReport: WorkspaceFixReport | null;
  preferredProvider: "bootrise" | "openai";
  githubUrl: string | null;
  updatedAt: string;
  createdAt: string;
}

export type ProjectStorageMode = "supabase" | "local" | "hybrid";

const WORKSPACE_TABLE = BOOTRISE_CORE_TABLES[0];
const storeRoot = resolve(process.cwd(), ".bootrise", "projects");

function ensureStore() {
  mkdirSync(storeRoot, { recursive: true });
}

function projectPath(id: string) {
  return join(storeRoot, `${id}.json`);
}

function rowToProject(row: {
  id: string;
  name: string;
  brief: ProjectBrief;
  files: SourceFileInput[];
  last_report: WorkspaceFixReport | null;
  preferred_provider: "bootrise" | "openai";
  github_url: string | null;
  created_at: string;
  updated_at: string;
}): WorkspaceProject {
  return {
    id: row.id,
    name: row.name,
    brief: row.brief,
    files: row.files ?? [],
    lastReport: row.last_report,
    preferredProvider: row.preferred_provider,
    githubUrl: row.github_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function projectToRow(project: WorkspaceProject) {
  return {
    id: project.id,
    name: project.name,
    brief: project.brief,
    files: project.files,
    last_report: project.lastReport,
    preferred_provider: project.preferredProvider,
    github_url: project.githubUrl,
    file_count: project.files.length,
    created_at: project.createdAt,
    updated_at: project.updatedAt
  };
}

function listLocalProjects(): WorkspaceProject[] {
  ensureStore();
  if (!existsSync(storeRoot)) return [];

  return readdirSync(storeRoot)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      try {
        return JSON.parse(readFileSync(join(storeRoot, name), "utf8")) as WorkspaceProject;
      } catch {
        return null;
      }
    })
    .filter((p): p is WorkspaceProject => Boolean(p))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function getLocalProject(id: string): WorkspaceProject | null {
  ensureStore();
  const path = projectPath(id);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as WorkspaceProject;
  } catch {
    return null;
  }
}

function saveLocalProject(project: WorkspaceProject) {
  ensureStore();
  writeFileSync(projectPath(project.id), JSON.stringify(project, null, 2), "utf8");
}

async function supabaseTableReady(): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return false;
  const { error } = await supabase.from(WORKSPACE_TABLE).select("id").limit(1);
  return !error;
}

async function listSupabaseProjects(): Promise<WorkspaceProject[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(WORKSPACE_TABLE)
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return data.map((row) => rowToProject(row as Parameters<typeof rowToProject>[0]));
}

async function getSupabaseProject(id: string): Promise<WorkspaceProject | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from(WORKSPACE_TABLE).select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return rowToProject(data as Parameters<typeof rowToProject>[0]);
}

async function persistToSupabase(project: WorkspaceProject): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return false;

  const { error } = await supabase.from(WORKSPACE_TABLE).upsert(projectToRow(project), { onConflict: "id" });
  return !error;
}

export async function getProjectStorageMode(): Promise<ProjectStorageMode> {
  const cloudReady = await supabaseTableReady();
  if (!cloudReady) return "local";
  const cloud = await listSupabaseProjects();
  const local = listLocalProjects();
  if (cloud.length > 0 && local.length > 0) return "hybrid";
  return cloud.length > 0 ? "supabase" : local.length > 0 ? "local" : "supabase";
}

export async function listProjects(): Promise<{ projects: WorkspaceProject[]; storage: ProjectStorageMode }> {
  const cloudReady = await supabaseTableReady();
  const local = listLocalProjects();

  if (!cloudReady) {
    return { projects: local, storage: "local" };
  }

  const cloud = await listSupabaseProjects();
  const merged = new Map<string, WorkspaceProject>();
  for (const project of cloud) merged.set(project.id, project);
  for (const project of local) {
    if (!merged.has(project.id)) merged.set(project.id, project);
  }

  const projects = Array.from(merged.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const storage: ProjectStorageMode =
    cloud.length > 0 && local.length > 0 ? "hybrid" : cloud.length > 0 ? "supabase" : local.length > 0 ? "local" : "supabase";

  return { projects, storage };
}

export async function getProject(id: string): Promise<WorkspaceProject | null> {
  if (await supabaseTableReady()) {
    const cloud = await getSupabaseProject(id);
    if (cloud) return cloud;
  }
  return getLocalProject(id);
}

export async function saveProject(
  input: Partial<WorkspaceProject> & { name: string; brief: ProjectBrief }
): Promise<{ project: WorkspaceProject; storage: ProjectStorageMode; cloudSaved: boolean }> {
  const existing = input.id ? await getProject(input.id) : null;
  const now = new Date().toISOString();
  const project: WorkspaceProject = {
    id: existing?.id ?? `proj_${Date.now()}`,
    name: input.name,
    brief: input.brief,
    files: input.files ?? existing?.files ?? [],
    lastReport: input.lastReport !== undefined ? input.lastReport : existing?.lastReport ?? null,
    preferredProvider: input.preferredProvider ?? existing?.preferredProvider ?? "bootrise",
    githubUrl: input.githubUrl !== undefined ? input.githubUrl : existing?.githubUrl ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };

  saveLocalProject(project);
  const cloudSaved = await persistToSupabase(project);
  const storage = await getProjectStorageMode();

  return { project, storage, cloudSaved };
}

export function parseUploadedFiles(raw: string): SourceFileInput[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Upload must be a JSON array of { path, content } objects.");
  return parsed.map((item) => {
    const row = item as { path?: string; content?: string };
    if (!row.path || typeof row.content !== "string") {
      throw new Error("Each file needs path and content.");
    }
    return { path: row.path, content: row.content };
  });
}
