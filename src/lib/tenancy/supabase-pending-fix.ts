import { getSupabaseServiceClient } from "@/lib/db/supabase";
import type { PendingFixRecord } from "@/lib/workspace/pending-fix-store";

const TABLE = "bootrise_pending_fixes";

export async function isCloudPendingReady(): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return false;
  const { error } = await supabase.from(TABLE).select("id").limit(1);
  return !error;
}

export async function persistCloudPendingFix(orgId: string, record: PendingFixRecord, projectId?: string): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return false;

  const { error } = await supabase.from(TABLE).upsert({
    id: record.id,
    org_id: orgId,
    project_id: projectId ?? null,
    repository_id: record.repositoryId,
    status: record.status,
    request: record.request,
    plan: record.plan,
    patches: record.patches,
    files_snapshot: record.filesSnapshot,
    provider: record.provider,
    planner_source: record.plannerSource,
    created_at: record.createdAt,
    resolved_at: record.resolvedAt ?? null
  });

  return !error;
}

export async function loadCloudPendingFix(orgId: string, id: string): Promise<PendingFixRecord | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("org_id", orgId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    repositoryId: data.repository_id as string,
    request: data.request as string,
    plan: data.plan as PendingFixRecord["plan"],
    patches: data.patches as PendingFixRecord["patches"],
    filesSnapshot: data.files_snapshot as PendingFixRecord["filesSnapshot"],
    provider: data.provider as PendingFixRecord["provider"],
    plannerSource: (data.planner_source as string) ?? "cloud",
    status: data.status as PendingFixRecord["status"],
    createdAt: data.created_at as string,
    resolvedAt: (data.resolved_at as string) ?? undefined
  };
}
