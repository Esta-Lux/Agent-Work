import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { SecurityFinding } from "@/lib/security/types";

export function runSecurityScan(files: SourceFileInput[]): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  let id = 0;
  const add = (partial: Omit<SecurityFinding, "id">) => {
    findings.push({ id: `finding_${++id}`, ...partial });
  };

  for (const file of files) {
    const { path, content } = file;
    if (/service[_-]?role|SUPABASE_SERVICE_ROLE|sk_live_|AKIA[0-9A-Z]{16}|api[_-]?key\s*=\s*['"][^'"]+['"]/i.test(content)) {
      add({
        severity: "critical",
        category: "secret",
        file: path,
        title: "Possible exposed secret",
        whyItMatters: "Secrets in source can leak via repos and client bundles.",
        evidence: content.slice(0, 120),
        recommendedFix: "Move to environment variables and rotate the key.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
    if (/createClient\([^)]*serviceRole|service_role/i.test(content) && /components|app\/(?!api)/.test(path)) {
      add({
        severity: "critical",
        category: "secret",
        file: path,
        title: "Service role key may be used in client code",
        whyItMatters: "Service role bypasses RLS and must never ship to browsers.",
        recommendedFix: "Use anon key + RLS on the client; service role only on server.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
    if (/app\/admin|\/admin/i.test(path) && !/requireAdmin|withAdminAuth|middleware/i.test(content)) {
      add({
        severity: "high",
        category: "auth",
        file: path,
        title: "Admin route without visible guard",
        whyItMatters: "Public admin surfaces allow unauthorized control plane access.",
        recommendedFix: "Add server-side admin auth on page and API routes.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
    if (/export async function (GET|POST|PUT|DELETE)/.test(content) && path.includes("api/") && !/requireUser|withWorkspaceAuth|getServerUser/i.test(content)) {
      add({
        severity: "high",
        category: "api",
        file: path,
        title: "API route may lack authentication",
        whyItMatters: "Unauthenticated APIs expose data and expensive actions.",
        recommendedFix: "Wrap handler with withWorkspaceAuth or requireUser.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
    if (/x-bootrise-user-id|x-bootrise-org-id/.test(content) && !/deprecated|do not trust/i.test(content)) {
      add({
        severity: "high",
        category: "authorization",
        file: path,
        title: "Client-controlled org/user headers",
        whyItMatters: "Attackers can spoof tenant headers without session verification.",
        recommendedFix: "Derive org and user from Supabase session only.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
    if (!/enable row level security|create policy/i.test(content) && /\.sql$/i.test(path) && /create table/i.test(content)) {
      add({
        severity: "medium",
        category: "database",
        file: path,
        title: "Table migration without visible RLS",
        whyItMatters: "Tables without RLS may expose rows across tenants.",
        recommendedFix: "Enable RLS and add org-scoped policies.",
        blocksDeployment: false,
        autoFixAvailable: false
      });
    }
    if (/stripe.*webhook/i.test(content) && !/constructEvent|stripe\.webhooks/i.test(content)) {
      add({
        severity: "critical",
        category: "payment",
        file: path,
        title: "Stripe webhook without signature verification",
        whyItMatters: "Forged webhooks can grant access or credits.",
        recommendedFix: "Verify webhook signatures with Stripe SDK.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
    if (/createProviderChatResponse|generateRealPatches|runSecurityScan/i.test(content) && path.includes("api/") && !/assertCreditsAvailable|assertModelRouteAllowed|withWorkspaceAuth/i.test(content)) {
      add({
        severity: "medium",
        category: "api",
        file: path,
        title: "Potentially unbounded AI endpoint",
        whyItMatters: "AI routes without credits/auth can cause cost and abuse.",
        recommendedFix: "Require auth and credit checks before model calls.",
        blocksDeployment: false,
        autoFixAvailable: false
      });
    }
    if (/Access-Control-Allow-Origin.*\*/.test(content) && path.includes("api/")) {
      add({
        severity: "high",
        category: "deployment",
        file: path,
        title: "CORS wildcard on API",
        whyItMatters: "Any origin can call sensitive APIs from browsers.",
        recommendedFix: "Restrict CORS to known app origins.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
    if (/stack|error\.message|err\.stack/i.test(content) && /NextResponse\.json|res\.json|return.*json/i.test(content)) {
      add({
        severity: "medium",
        category: "logging",
        file: path,
        title: "Raw error may leak to client",
        whyItMatters: "Stack traces reveal internals to attackers.",
        recommendedFix: "Return safe error messages; log details server-side only.",
        blocksDeployment: false,
        autoFixAvailable: false
      });
    }
  }

  return findings;
}
