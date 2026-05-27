import { isServerDevAuthBypass } from "@/lib/auth/dev-bypass";
import { getSupabaseHealthReport } from "@/lib/db/supabase-health";

export interface ReadinessItem {
  area: string;
  status: "ready" | "partial" | "missing";
  summary: string;
  nextStep: string;
}

export interface ReadinessReport {
  productionReady: boolean;
  score: number;
  items: ReadinessItem[];
}

const P0_AREAS = [
  "Auth",
  "Tenant isolation",
  "Admin protection",
  "Control layer",
  "Usage/Credits",
  "Draft PR hardening",
  "Pending fix persistence"
] as const;

export async function getProductionReadinessReport(): Promise<ReadinessReport> {
  const health = await getSupabaseHealthReport();
  const devBypass = isServerDevAuthBypass();
  const supabaseAuth = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  const items: ReadinessItem[] = [
    {
      area: "Auth",
      status: supabaseAuth || devBypass ? (devBypass ? "partial" : "ready") : "missing",
      summary: supabaseAuth
        ? "Supabase session auth configured for workspace and admin."
        : devBypass
          ? "Dev auth bypass enabled — not valid for production."
          : "No Supabase auth configured.",
      nextStep: devBypass
        ? "Production disables dev bypass automatically; configure Supabase Auth for deploy."
        : "Configure NEXT_PUBLIC_SUPABASE_* and auth redirect URLs."
    },
    {
      area: "Tenant isolation",
      status: "ready",
      summary: "Workspace APIs use withWorkspaceAuth; org hints require membership in bootrise_org_members.",
      nextStep: "Run tenant isolation tests with BOOTRISE_DEV_AUTH_STRICT=1 against a live dev server."
    },
    {
      area: "Admin protection",
      status: "ready",
      summary: "Admin layout + page require admin; all /api/admin routes use withAdminAuth.",
      nextStep: "Keep BOOTRISE_ADMIN_EMAILS aligned with operator accounts."
    },
    {
      area: "Project Brain",
      status: health.extendedSchemaReady ? "ready" : health.schemaReady ? "partial" : "missing",
      summary: health.extendedSchemaReady
        ? "Brain tables, indexer, UI tab, and context injection are wired."
        : "Migration 007+ or brain tables missing in Supabase.",
      nextStep: "Run migrations 007_project_brain.sql through 009+ in Supabase SQL Editor."
    },
    {
      area: "Control layer",
      status: "ready",
      summary: "Context Gate, Scope Contract, Patch Guard, and orchestrator run before patch generation and approve.",
      nextStep: "Monitor control telemetry in admin for block rates."
    },
    {
      area: "Usage/Credits",
      status: health.tables.find((t) => t.name === "bootrise_credit_balances")?.exists ? "ready" : "partial",
      summary: "Model router charges decision.quota.creditsRequired; scan/PR routes pass explicit credit amounts.",
      nextStep: health.extendedSchemaReady ? "Wire Stripe billing when ready." : "Run migrations 005 and 008 for usage/credit tables."
    },
    {
      area: "Draft PR hardening",
      status: "ready",
      summary: "POST /api/workspace/github/pr derives patched files and PR body from server pending fix only.",
      nextStep: "Configure GitHub App (GITHUB_APP_ID + private key) or GITHUB_TOKEN for automated draft PRs."
    },
    {
      area: "Pending fix persistence",
      status: health.tables.find((t) => t.name === "bootrise_pending_fixes")?.exists ? "ready" : "missing",
      summary: "control_layer JSON persisted on bootrise_pending_fixes (migration 009).",
      nextStep: "Apply 009_pending_fix_control_layer.sql in Supabase."
    },
    {
      area: "Security scan",
      status: "partial",
      summary: "Modular deterministic scanners (secrets, auth, API, RLS, Stripe, CORS, etc.) with deployment score.",
      nextStep: "Expand dependency audit via CI npm audit; store findings in Project Brain."
    },
    {
      area: "Deployment readiness",
      status: "partial",
      summary: "evaluateDeploymentReadiness returns score, status, blockers, and missing production items.",
      nextStep: "Connect readiness to release gates in CI/CD."
    },
    {
      area: "Worker backend",
      status: "partial",
      summary: "Local job queue at /api/workspace/jobs for index and scan tasks — not distributed workers.",
      nextStep: "Add Inngest/Trigger.dev for long-running repo index at scale."
    },
    {
      area: "Billing",
      status: "missing",
      summary: "Credits tracked per org; Stripe subscriptions not integrated.",
      nextStep: "Add Stripe plans, webhooks with signature verification, and org plan enforcement."
    }
  ];

  const score = Math.round(
    (items.reduce((sum, item) => sum + (item.status === "ready" ? 1 : item.status === "partial" ? 0.5 : 0), 0) /
      items.length) *
      100
  );

  const p0Ready = P0_AREAS.every((area) => {
    const item = items.find((i) => i.area === area);
    return item?.status === "ready";
  });

  const productionReady = p0Ready && !devBypass && health.extendedSchemaReady;

  return {
    productionReady,
    score,
    items
  };
}
