import { createHash } from "node:crypto";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { FileIndexEntry } from "@/lib/project-brain/types";
import {
  loadLocalFileIndex,
  saveLocalFileIndex
} from "@/lib/project-brain/brain-store-local";
import { getSupabaseServiceClient } from "@/lib/db/supabase";

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function detectLanguage(path: string): string | undefined {
  const ext = path.includes(".") ? path.slice(path.lastIndexOf(".")) : "";
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".sql": "sql",
    ".md": "markdown"
  };
  return map[ext];
}

function riskForPath(path: string): string {
  if (/\.env|secret|credential|service.?role/i.test(path)) return "critical";
  if (/auth|billing|payment|stripe|supabase|migration/i.test(path)) return "high";
  return "normal";
}

export async function indexProjectFiles(input: {
  orgId: string;
  projectId: string;
  repositoryId?: string;
  files: SourceFileInput[];
}): Promise<{ indexed: number; skipped: number; entries: FileIndexEntry[] }> {
  const existing = await loadFileIndex(input.orgId, input.projectId);
  const byPath = new Map(existing.map((e) => [e.path, e]));
  let indexed = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const file of input.files) {
    const hash = hashContent(file.content);
    const prev = byPath.get(file.path);
    if (prev?.hash === hash) {
      skipped++;
      continue;
    }
    const entry: FileIndexEntry = {
      id: prev?.id ?? `file_${hash}_${file.path.replace(/\W/g, "_").slice(0, 40)}`,
      orgId: input.orgId,
      projectId: input.projectId,
      repositoryId: input.repositoryId,
      path: file.path,
      hash,
      language: detectLanguage(file.path),
      sizeBytes: file.content.length,
      moduleName: file.path.split("/")[0] || "root",
      summary: file.content.slice(0, 200).replace(/\s+/g, " ").trim(),
      riskLevel: riskForPath(file.path),
      lastIndexedAt: now
    };
    byPath.set(file.path, entry);
    indexed++;
  }

  const entries = Array.from(byPath.values());
  await persistFileIndex(input.orgId, input.projectId, entries);
  return { indexed, skipped, entries };
}

export async function updateFileIndex(input: {
  orgId: string;
  projectId: string;
  repositoryId?: string;
  files: SourceFileInput[];
}) {
  return indexProjectFiles(input);
}

export async function loadFileIndex(orgId: string, projectId: string): Promise<FileIndexEntry[]> {
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("bootrise_file_index")
      .select("*")
      .eq("org_id", orgId)
      .eq("project_id", projectId);
    if (data?.length) {
      return data.map((row) => ({
        id: row.id as string,
        orgId: row.org_id as string,
        projectId: row.project_id as string,
        repositoryId: (row.repository_id as string) ?? undefined,
        path: row.path as string,
        hash: row.hash as string,
        language: (row.language as string) ?? undefined,
        sizeBytes: (row.size_bytes as number) ?? 0,
        moduleName: (row.module_name as string) ?? undefined,
        summary: (row.summary as string) ?? undefined,
        riskLevel: (row.risk_level as string) ?? "normal",
        lastIndexedAt: row.last_indexed_at as string
      }));
    }
  }
  return loadLocalFileIndex(orgId, projectId);
}

async function persistFileIndex(orgId: string, projectId: string, entries: FileIndexEntry[]) {
  saveLocalFileIndex(orgId, projectId, entries);
  const supabase = getSupabaseServiceClient();
  if (!supabase) return;
  const rows = entries.map((e) => ({
    id: e.id,
    org_id: e.orgId,
    project_id: e.projectId,
    repository_id: e.repositoryId ?? null,
    path: e.path,
    hash: e.hash,
    language: e.language ?? null,
    size_bytes: e.sizeBytes,
    module_name: e.moduleName ?? null,
    summary: e.summary ?? null,
    risk_level: e.riskLevel,
    last_indexed_at: e.lastIndexedAt,
    metadata: {}
  }));
  await supabase.from("bootrise_file_index").upsert(rows, { onConflict: "project_id,path" });
}
