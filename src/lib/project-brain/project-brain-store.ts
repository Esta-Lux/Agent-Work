import type { ProjectBrain, ProjectMemoryItem } from "@/lib/project-brain/types";
import {
  loadLocalBrain,
  loadLocalMemory,
  saveLocalBrain,
  saveLocalMemory
} from "@/lib/project-brain/brain-store-local";
import { getSupabaseServiceClient } from "@/lib/db/supabase";

export async function createOrGetProjectBrain(input: {
  orgId: string;
  projectId: string;
  name?: string;
}): Promise<ProjectBrain> {
  const existing = await getProjectBrain(input.orgId, input.projectId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const brain: ProjectBrain = {
    id: `brain_${input.projectId}`,
    orgId: input.orgId,
    projectId: input.projectId,
    name: input.name ?? `Project ${input.projectId}`,
    summary: "BootRise Project Brain initialized from repository import.",
    status: "active",
    updatedAt: now
  };

  saveLocalBrain(brain);
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    await supabase.from("bootrise_project_brains").upsert({
      id: brain.id,
      org_id: brain.orgId,
      project_id: brain.projectId,
      name: brain.name,
      summary: brain.summary,
      status: brain.status,
      updated_at: brain.updatedAt
    });
  }

  return brain;
}

export async function getProjectBrain(orgId: string, projectId: string): Promise<ProjectBrain | null> {
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("bootrise_project_brains")
      .select("*")
      .eq("org_id", orgId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (data) {
      return {
        id: data.id as string,
        orgId: data.org_id as string,
        projectId: data.project_id as string,
        name: data.name as string,
        summary: (data.summary as string) ?? null,
        status: data.status as string,
        updatedAt: data.updated_at as string
      };
    }
  }
  return loadLocalBrain(orgId, projectId);
}

export async function listMemoryItems(orgId: string, projectId: string): Promise<ProjectMemoryItem[]> {
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("bootrise_project_memory_items")
      .select("*")
      .eq("org_id", orgId)
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });
    if (data?.length) {
      return data.map(memoryRowToItem);
    }
  }
  return loadLocalMemory(orgId, projectId);
}

export async function upsertMemoryItem(item: ProjectMemoryItem): Promise<void> {
  const items = await listMemoryItems(item.orgId, item.projectId);
  const next = [...items.filter((i) => i.id !== item.id), item];
  saveLocalMemory(item.orgId, item.projectId, next);
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    await supabase.from("bootrise_project_memory_items").upsert({
      id: item.id,
      org_id: item.orgId,
      project_id: item.projectId,
      brain_id: item.brainId,
      type: item.type,
      title: item.title,
      content: item.content,
      source: item.source,
      confidence: item.confidence,
      status: item.status,
      related_paths: item.relatedPaths,
      metadata: item.metadata,
      updated_at: item.updatedAt
    });
  }
}

function memoryRowToItem(row: Record<string, unknown>): ProjectMemoryItem {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    projectId: row.project_id as string,
    brainId: row.brain_id as string,
    type: row.type as ProjectMemoryItem["type"],
    title: row.title as string,
    content: row.content as string,
    source: row.source as string,
    confidence: Number(row.confidence ?? 0.7),
    status: row.status as ProjectMemoryItem["status"],
    relatedPaths: (row.related_paths as string[]) ?? [],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    updatedAt: row.updated_at as string
  };
}
