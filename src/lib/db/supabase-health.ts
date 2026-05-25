import { getSupabaseConfig, getSupabaseDashboardUrl, getSupabaseServiceClient } from "@/lib/db/supabase";

export const BOOTRISE_CORE_TABLES = [
  "bootrise_workspace_projects",
  "bootrise_admin_telemetry"
] as const;

export type BootriseCoreTable = (typeof BOOTRISE_CORE_TABLES)[number];

export interface TableHealth {
  name: BootriseCoreTable;
  exists: boolean;
  rowCount: number | null;
  error: string | null;
}

export interface SupabaseHealthReport {
  configured: boolean;
  connected: boolean;
  schemaReady: boolean;
  projectRef: string | null;
  dashboardUrl: string | null;
  publishableKeySet: boolean;
  tables: TableHealth[];
  message: string;
  setupHint: string | null;
}

async function probeTable(name: BootriseCoreTable): Promise<TableHealth> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { name, exists: false, rowCount: null, error: "Supabase client not configured." };
  }

  const { count, error } = await supabase.from(name).select("*", { count: "exact", head: true });

  if (error) {
    const missing = error.message.includes("Could not find the table") || error.code === "PGRST205";
    return {
      name,
      exists: !missing,
      rowCount: null,
      error: error.message
    };
  }

  return { name, exists: true, rowCount: count ?? 0, error: null };
}

export async function getSupabaseHealthReport(): Promise<SupabaseHealthReport> {
  const config = getSupabaseConfig();
  const dashboardUrl = getSupabaseDashboardUrl();

  if (!config) {
    return {
      configured: false,
      connected: false,
      schemaReady: false,
      projectRef: null,
      dashboardUrl: null,
      publishableKeySet: false,
      tables: BOOTRISE_CORE_TABLES.map((name) => ({
        name,
        exists: false,
        rowCount: null,
        error: "Not configured"
      })),
      message: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env",
      setupHint: "Copy supabase/migrations/002_workspace_core.sql into the Supabase SQL Editor and run it."
    };
  }

  const tables = await Promise.all(BOOTRISE_CORE_TABLES.map((name) => probeTable(name)));
  const schemaReady = tables.every((table) => table.exists);
  const authFailed = tables.some((table) => /invalid api key|jwt/i.test(table.error ?? ""));
  const connected = !authFailed && tables.some((table) => table.exists || (table.error?.includes("Could not find the table") ?? false));

  return {
    configured: true,
    connected,
    schemaReady,
    projectRef: config.projectRef,
    dashboardUrl,
    publishableKeySet: Boolean(config.publishableKey),
    tables,
    message: schemaReady
      ? "Supabase connected and BootRise schema is ready."
      : "Supabase API reachable but BootRise tables are missing. Run migration 002_workspace_core.sql.",
    setupHint: schemaReady
      ? null
      : "Open Supabase → SQL Editor → paste supabase/migrations/002_workspace_core.sql → Run."
  };
}
