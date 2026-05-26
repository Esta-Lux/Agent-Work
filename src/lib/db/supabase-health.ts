import { getSupabaseConfig, getSupabaseDashboardUrl, getSupabaseServiceClient } from "@/lib/db/supabase";

export const BOOTRISE_CORE_TABLES = [
  "bootrise_workspace_projects",
  "bootrise_admin_telemetry",
  "bootrise_organizations",
  "bootrise_living_ledger_events",
  "bootrise_pending_fixes",
  "bootrise_audit_events",
  "bootrise_preview_sessions",
  "bootrise_remote_streams"
] as const;

export const BOOTRISE_EXTENDED_TABLES = [
  "bootrise_usage_events",
  "bootrise_credit_balances",
  "bootrise_credit_transactions",
  "bootrise_github_pull_requests",
  "bootrise_project_brains",
  "bootrise_file_index",
  "bootrise_module_index"
] as const;

export const BOOTRISE_ALL_TABLES = [...BOOTRISE_CORE_TABLES, ...BOOTRISE_EXTENDED_TABLES] as const;

export type BootriseTableName = (typeof BOOTRISE_ALL_TABLES)[number];

export interface TableHealth {
  name: BootriseTableName;
  exists: boolean;
  rowCount: number | null;
  error: string | null;
}

export interface SupabaseHealthReport {
  configured: boolean;
  connected: boolean;
  schemaReady: boolean;
  extendedSchemaReady: boolean;
  projectRef: string | null;
  dashboardUrl: string | null;
  publishableKeySet: boolean;
  tables: TableHealth[];
  missingTables: string[];
  message: string;
  setupHint: string | null;
}

async function probeTable(name: BootriseTableName): Promise<TableHealth> {
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
  const setupHint =
    "Supabase → SQL Editor → run all files in supabase/migrations/ in order (001 through 009+).";

  if (!config) {
    return {
      configured: false,
      connected: false,
      schemaReady: false,
      extendedSchemaReady: false,
      projectRef: null,
      dashboardUrl: null,
      publishableKeySet: false,
      tables: BOOTRISE_ALL_TABLES.map((name) => ({
        name,
        exists: false,
        rowCount: null,
        error: "Not configured"
      })),
      missingTables: [...BOOTRISE_ALL_TABLES],
      message: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env",
      setupHint
    };
  }

  const tables = await Promise.all(BOOTRISE_ALL_TABLES.map((name) => probeTable(name)));
  const missingTables = tables.filter((t) => !t.exists).map((t) => t.name);

  const coreRequired = [
    "bootrise_workspace_projects",
    "bootrise_organizations",
    "bootrise_living_ledger_events"
  ] as const;
  const schemaReady = coreRequired.every((name) => tables.find((t) => t.name === name)?.exists);

  const extendedRequired = [
    "bootrise_usage_events",
    "bootrise_credit_balances",
    "bootrise_github_pull_requests",
    "bootrise_project_brains"
  ] as const;
  const extendedSchemaReady = extendedRequired.every((name) => tables.find((t) => t.name === name)?.exists);

  const authFailed = tables.some((table) => /invalid api key|jwt/i.test(table.error ?? ""));
  const connected =
    !authFailed && tables.some((table) => table.exists || (table.error?.includes("Could not find the table") ?? false));

  let message: string;
  if (!schemaReady) {
    message = "Supabase reachable but core BootRise tables are missing.";
  } else if (!extendedSchemaReady) {
    message = `Core schema ready. Missing extended tables: ${missingTables.filter((n) => BOOTRISE_EXTENDED_TABLES.includes(n as (typeof BOOTRISE_EXTENDED_TABLES)[number])).join(", ") || "none listed"}.`;
  } else {
    message = "Supabase connected — core, credits, PR, and Project Brain tables ready.";
  }

  return {
    configured: true,
    connected,
    schemaReady,
    extendedSchemaReady,
    projectRef: config.projectRef,
    dashboardUrl,
    publishableKeySet: Boolean(config.publishableKey),
    tables,
    missingTables,
    message,
    setupHint: schemaReady && extendedSchemaReady ? null : setupHint
  };
}
