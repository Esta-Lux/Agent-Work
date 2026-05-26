import type { MemoryItemType, ProjectMemoryItem } from "@/lib/project-brain/types";
import { createOrGetProjectBrain, upsertMemoryItem } from "@/lib/project-brain/project-brain-store";

export async function upsertProjectRule(input: {
  orgId: string;
  projectId: string;
  title: string;
  content: string;
  source?: string;
  relatedPaths?: string[];
}) {
  const brain = await createOrGetProjectBrain({ orgId: input.orgId, projectId: input.projectId });
  const now = new Date().toISOString();
  await upsertMemoryItem({
    id: `mem_rule_${input.title.replace(/\W/g, "_").slice(0, 32)}`,
    orgId: input.orgId,
    projectId: input.projectId,
    brainId: brain.id,
    type: "rule",
    title: input.title,
    content: input.content,
    source: input.source ?? "user",
    confidence: 0.95,
    status: "active",
    relatedPaths: input.relatedPaths ?? [],
    metadata: {},
    updatedAt: now
  });
}

export async function upsertDecisionRecord(input: {
  orgId: string;
  projectId: string;
  title: string;
  decision: string;
  reason?: string;
  source?: string;
  createdBy?: string;
}) {
  const brain = await createOrGetProjectBrain({ orgId: input.orgId, projectId: input.projectId });
  const now = new Date().toISOString();
  await upsertMemoryItem({
    id: `mem_dec_${Date.now()}`,
    orgId: input.orgId,
    projectId: input.projectId,
    brainId: brain.id,
    type: "decision",
    title: input.title,
    content: `${input.decision}${input.reason ? ` — ${input.reason}` : ""}`,
    source: input.source ?? "user",
    confidence: 0.9,
    status: "active",
    relatedPaths: [],
    metadata: { createdBy: input.createdBy },
    updatedAt: now
  });
}

export async function recordMemoryCorrection(input: {
  orgId: string;
  projectId: string;
  memoryItemId: string;
  newValue: string;
  correctedBy: string;
}) {
  const { listMemoryItems } = await import("@/lib/project-brain/project-brain-store");
  const items = await listMemoryItems(input.orgId, input.projectId);
  const item = items.find((i) => i.id === input.memoryItemId);
  if (!item) throw new Error("Memory item not found.");

  const oldValue = item.content;
  await upsertMemoryItem({
    ...item,
    content: input.newValue,
    source: "user_correction",
    confidence: 1,
    status: "active",
    updatedAt: new Date().toISOString()
  });

  const { getSupabaseServiceClient } = await import("@/lib/db/supabase");
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    await supabase.from("bootrise_memory_corrections").insert({
      id: `corr_${Date.now()}`,
      org_id: input.orgId,
      project_id: input.projectId,
      memory_item_id: input.memoryItemId,
      old_value: oldValue,
      new_value: input.newValue,
      corrected_by: input.correctedBy
    });
  }
}

export async function addArchitectureMemory(input: {
  orgId: string;
  projectId: string;
  title: string;
  content: string;
  type?: MemoryItemType;
  relatedPaths?: string[];
}) {
  const brain = await createOrGetProjectBrain({ orgId: input.orgId, projectId: input.projectId });
  const now = new Date().toISOString();
  await upsertMemoryItem({
    id: `mem_${input.type ?? "architecture"}_${Date.now()}`,
    orgId: input.orgId,
    projectId: input.projectId,
    brainId: brain.id,
    type: input.type ?? "architecture",
    title: input.title,
    content: input.content,
    source: "repo_scan",
    confidence: 0.7,
    status: "active",
    relatedPaths: input.relatedPaths ?? [],
    metadata: {},
    updatedAt: now
  });
}
