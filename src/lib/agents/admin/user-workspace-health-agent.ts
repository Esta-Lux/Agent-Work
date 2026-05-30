import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface WorkspaceHealthCheck {
  id: string;
  label: string;
  status: "healthy" | "warning";
  detail: string;
}

export interface UserWorkspaceHealthReport {
  healthy: boolean;
  score: number;
  checks: WorkspaceHealthCheck[];
}

const CHECKS: Array<{ id: string; label: string; path: string }> = [
  { id: "auth-gate", label: "Auth gate component", path: "src/components/auth-gate.tsx" },
  { id: "workspace-shell-v2", label: "WorkspaceShellV2", path: "src/components/workspace/workspace-shell-v2.tsx" },
  { id: "editable-file-state", label: "Editable workspace file state", path: "src/lib/workspace/workspace-file-state.ts" },
  { id: "repo-import-route", label: "Repo import route", path: "src/app/api/workspace/github/import/route.ts" },
  { id: "branch-route", label: "Branch lookup route", path: "src/app/api/workspace/github/branches/route.ts" },
  { id: "fix-route", label: "Fix route", path: "src/app/api/workspace/fix/route.ts" },
  { id: "fix-approve-route", label: "Approve route", path: "src/app/api/workspace/fix/approve/route.ts" },
  { id: "fix-reject-route", label: "Reject route", path: "src/app/api/workspace/fix/reject/route.ts" },
  { id: "verify-route", label: "Verify route", path: "src/app/api/workspace/sandbox/verify/route.ts" },
  { id: "export-route", label: "Export route", path: "src/app/api/workspace/export/route.ts" },
  { id: "security-route", label: "Security scan route", path: "src/app/api/workspace/security/scan/route.ts" },
  { id: "readiness-route", label: "Deploy readiness route", path: "src/app/api/workspace/deploy/readiness/route.ts" },
  { id: "credits-route", label: "Credits route", path: "src/app/api/workspace/credits/route.ts" },
  { id: "provider-route", label: "Provider health route", path: "src/app/api/admin/agent/provider-keys/route.ts" },
  { id: "patch-actions", label: "Patch approve/reject UI wiring", path: "src/components/workspace/workspace-diff-viewer.tsx" }
];

export function runUserWorkspaceHealthAgent(): UserWorkspaceHealthReport {
  const checks = CHECKS.map((check) => {
    const exists = existsSync(resolve(process.cwd(), check.path));
    return {
      id: check.id,
      label: check.label,
      status: exists ? "healthy" : "warning",
      detail: exists ? `Found at ${check.path}` : `Missing expected file: ${check.path}`
    } satisfies WorkspaceHealthCheck;
  });

  const healthyCount = checks.filter((check) => check.status === "healthy").length;
  return {
    healthy: healthyCount === checks.length,
    score: Math.round((healthyCount / checks.length) * 100),
    checks
  };
}
