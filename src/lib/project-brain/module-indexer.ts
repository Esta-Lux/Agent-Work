import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ModuleIndexEntry } from "@/lib/project-brain/types";
import { loadLocalModules, saveLocalModules } from "@/lib/project-brain/brain-store-local";
import { getSupabaseServiceClient } from "@/lib/db/supabase";

export async function buildModuleIndex(input: {
  orgId: string;
  projectId: string;
  files: SourceFileInput[];
}): Promise<ModuleIndexEntry[]> {
  const groups = new Map<string, string[]>();
  for (const file of input.files) {
    const top = file.path.split("/")[0] || "root";
    const list = groups.get(top) ?? [];
    list.push(file.path);
    groups.set(top, list);
  }

  const now = new Date().toISOString();
  const modules: ModuleIndexEntry[] = Array.from(groups.entries()).map(([name, paths]) => ({
    id: `mod_${input.projectId}_${name}`.replace(/\W/g, "_"),
    orgId: input.orgId,
    projectId: input.projectId,
    name,
    purpose: `Top-level module with ${paths.length} files`,
    mainFiles: paths.slice(0, 12),
    summary: `Contains ${paths.length} files under ${name}/`,
    confidence: 0.75,
    risks: name.match(/auth|api|admin|payment/i) ? ["Sensitive surface — verify scope before edits"] : []
  }));

  saveLocalModules(input.orgId, input.projectId, modules);
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    await supabase.from("bootrise_module_index").upsert(
      modules.map((m) => ({
        id: m.id,
        org_id: m.orgId,
        project_id: m.projectId,
        name: m.name,
        purpose: m.purpose,
        main_files: m.mainFiles,
        apis: [],
        database_tables: [],
        risks: m.risks,
        summary: m.summary,
        confidence: m.confidence,
        updated_at: now
      })),
      { onConflict: "id" }
    );
  }

  return modules;
}

export async function listModules(orgId: string, projectId: string): Promise<ModuleIndexEntry[]> {
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("bootrise_module_index")
      .select("*")
      .eq("org_id", orgId)
      .eq("project_id", projectId);
    if (data?.length) {
      return data.map((row) => ({
        id: row.id as string,
        orgId: row.org_id as string,
        projectId: row.project_id as string,
        name: row.name as string,
        purpose: (row.purpose as string) ?? undefined,
        mainFiles: (row.main_files as string[]) ?? [],
        summary: (row.summary as string) ?? undefined,
        confidence: Number(row.confidence ?? 0.7),
        risks: (row.risks as string[]) ?? []
      }));
    }
  }
  return loadLocalModules(orgId, projectId);
}
