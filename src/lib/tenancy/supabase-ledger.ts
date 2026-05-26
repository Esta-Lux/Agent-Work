import { getSupabaseServiceClient } from "@/lib/db/supabase";
import type { LedgerEvent, LedgerEventKind } from "@/lib/workspace/living-ledger-timeline";

const TABLE = "bootrise_living_ledger_events";

export async function isCloudLedgerReady(): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return false;
  const { error } = await supabase.from(TABLE).select("id").limit(1);
  return !error;
}

export async function appendCloudLedgerEvent(
  orgId: string,
  projectId: string,
  event: Omit<LedgerEvent, "id" | "projectId" | "createdAt">
): Promise<LedgerEvent | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  const row: LedgerEvent = {
    id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    projectId,
    createdAt: new Date().toISOString(),
    ...event
  };

  const { error } = await supabase.from(TABLE).insert({
    id: row.id,
    org_id: orgId,
    project_id: projectId,
    kind: row.kind,
    title: row.title,
    narrative: row.narrative,
    metadata: row.metadata ?? {},
    created_at: row.createdAt
  });

  if (error) return null;
  return row;
}

export async function listCloudLedgerEvents(orgId: string, projectId: string, limit = 40): Promise<LedgerEvent[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, project_id, kind, title, narrative, metadata, created_at")
    .eq("org_id", orgId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    projectId: row.project_id as string,
    kind: row.kind as LedgerEventKind,
    title: row.title as string,
    narrative: row.narrative as string,
    metadata: (row.metadata as Record<string, string | number | boolean>) ?? {},
    createdAt: row.created_at as string
  }));
}
