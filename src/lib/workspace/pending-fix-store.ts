import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ChangePlan } from "@/lib/types/core";
import type { LlmProviderId } from "@/lib/ai/providers";
import { DEFAULT_ORG_ID } from "@/lib/tenancy/org-context";
import {
  isCloudPendingReady,
  loadCloudPendingFix,
  persistCloudPendingFix
} from "@/lib/tenancy/supabase-pending-fix";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import {
  deletePendingFixRecord,
  loadPendingFixRecord,
  persistPendingFixRecord,
  pruneStalePendingFixes
} from "@/lib/workspace/pending-fix-persistence";

export type PendingFixStatus = "pending_approval" | "approved" | "rejected";

export interface PendingFixRecord {
  id: string;
  repositoryId: string;
  request: string;
  plan: ChangePlan;
  patches: ProposedPatch[];
  filesSnapshot: SourceFileInput[];
  provider: LlmProviderId;
  plannerSource: string;
  status: PendingFixStatus;
  createdAt: string;
  resolvedAt?: string;
}

const memoryCache = new Map<string, PendingFixRecord>();

let pruned = false;
function ensurePrune() {
  if (pruned) return;
  pruned = true;
  pruneStalePendingFixes();
}

export function savePendingFix(
  record: PendingFixRecord,
  options?: { orgId?: string; projectId?: string }
): void {
  ensurePrune();
  memoryCache.set(record.id, record);
  persistPendingFixRecord(record);
  void persistCloud(record, options);
}

async function persistCloud(record: PendingFixRecord, options?: { orgId?: string; projectId?: string }) {
  if (!(await isCloudPendingReady())) return;
  await persistCloudPendingFix(options?.orgId ?? DEFAULT_ORG_ID, record, options?.projectId);
}

export async function getPendingFix(id: string, orgId: string = DEFAULT_ORG_ID): Promise<PendingFixRecord | undefined> {
  ensurePrune();
  const cached = memoryCache.get(id);
  if (cached) return cached;

  const loaded = loadPendingFixRecord(id);
  if (loaded) {
    memoryCache.set(id, loaded);
    return loaded;
  }

  const cloud = await loadCloudPendingFix(orgId, id);
  if (cloud) {
    memoryCache.set(id, cloud);
    return cloud;
  }
  return undefined;
}

export function updatePendingFixStatus(
  id: string,
  status: PendingFixStatus,
  options?: { orgId?: string; projectId?: string }
): PendingFixRecord | undefined {
  const record = memoryCache.get(id) ?? loadPendingFixRecord(id);
  if (!record) return undefined;
  record.status = status;
  record.resolvedAt = new Date().toISOString();
  savePendingFix(record, options);
  return record;
}

export function removePendingFix(id: string): void {
  memoryCache.delete(id);
  deletePendingFixRecord(id);
}

export function createPendingFixId(): string {
  return `pending_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
