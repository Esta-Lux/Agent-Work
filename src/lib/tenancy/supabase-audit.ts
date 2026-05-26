import { getSupabaseServiceClient } from "@/lib/db/supabase";
import type { AuditEntry } from "@/lib/admin/audit-log";

const TABLE = "bootrise_audit_events";

export async function isCloudAuditReady(): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return false;
  const { error } = await supabase.from(TABLE).select("id").limit(1);
  return !error;
}

export async function recordCloudAudit(
  orgId: string,
  entry: Omit<AuditEntry, "id" | "createdAt">
): Promise<AuditEntry | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  const row: AuditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    ...entry
  };

  const { error } = await supabase.from(TABLE).insert({
    id: row.id,
    org_id: orgId,
    actor: row.actor,
    action: row.action,
    detail: row.detail,
    metadata: row.metadata ?? {},
    created_at: row.createdAt
  });

  if (error) return null;
  return row;
}

export async function listCloudAudit(orgId: string, limit = 50): Promise<AuditEntry[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, actor, action, detail, metadata, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    actor: row.actor as string,
    action: row.action as string,
    detail: row.detail as string,
    metadata: (row.metadata as AuditEntry["metadata"]) ?? {},
    createdAt: row.created_at as string
  }));
}
