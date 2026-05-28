import { redactSecrets } from "@/lib/admin/agent-tool-loop";
import type { AdminDetection } from "@/lib/admin/detections/types";

function templateFor(detection: AdminDetection): string {
  const paths = (detection.affectedPaths ?? []).slice(0, 3).join(", ") || "(no paths)";
  switch (detection.kind) {
    case "auth_missing":
      return `Wrap ${paths} with withTenantAuth so the workspace route enforces tenant scoping. Detection ${detection.kind}/${detection.severity}.`;
    case "org_scoping_missing":
      return `Thread orgId through the helper at ${paths} so per-tenant state is isolated. Detection ${detection.kind}/${detection.severity}.`;
    case "client_server_boundary":
      return `Refactor ${paths} so the client component no longer imports a server module. Move the call behind an API route or server action. Detection ${detection.kind}/${detection.severity}.`;
    case "audit_log_missing":
      return `Add a recordAudit(...) call to mutating handlers in ${paths} so admin operations are auditable. Detection ${detection.kind}/${detection.severity}.`;
    case "kill_switch_bypass":
      return `Ensure the privileged path at ${paths} is gated by assertKillSwitchAllowed before performing the action. Detection ${detection.kind}/${detection.severity}.`;
    case "runtime_failure_cluster":
      return `Investigate runtime errors clustered under "${detection.description.slice(0, 100)}" and stabilise the failing handler. Detection ${detection.kind}/${detection.severity}.`;
    case "usage_failure_spike":
      return `Investigate the usage failure spike (${detection.description.slice(0, 80)}); check provider health and recent model routing changes. Detection ${detection.kind}/${detection.severity}.`;
    case "pending_fix_failure":
      return `Review the recent pending-fix failures to identify a common cause and harden the planner/coder path. Detection ${detection.kind}/${detection.severity}.`;
    case "security_finding":
      return `Apply the recommended security fix: ${detection.suggestedAction ?? detection.description.slice(0, 120)} (paths: ${paths}). Detection ${detection.kind}/${detection.severity}.`;
    default:
      return `Investigate detection ${detection.kind}/${detection.severity} affecting ${paths}.`;
  }
}

export function detectionToFixRequest(detection: AdminDetection): string {
  const base = templateFor(detection).slice(0, 580);
  return redactSecrets(base);
}
