import type { AuthUser } from "@/lib/auth/types";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { loadSelfRepoSnapshot } from "@/lib/admin/self-repo";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import { recordAudit } from "@/lib/admin/audit-log";
import { recordDetection } from "@/lib/admin/detections/store";
import type { AdminDetection } from "@/lib/admin/detections/types";
import { ruleRouteAuth } from "@/lib/admin/detections/rules/rule-route-auth";
import { ruleOrgScoping } from "@/lib/admin/detections/rules/rule-org-scoping";
import { ruleClientServerBoundary } from "@/lib/admin/detections/rules/rule-client-server-boundary";
import { ruleAuditLog } from "@/lib/admin/detections/rules/rule-audit-log";
import { ruleSecurityFindings } from "@/lib/admin/detections/rules/rule-security-findings";

const USER_SURFACE_PATTERNS = [
  /^src\/app\/\(workspace\)\//,
  /^src\/app\/\(public\)\//,
  /^src\/app\/api\/workspace\//,
  /^src\/components\/workspace-/,
  /^src\/components\/workspace\//,
  /^src\/lib\/workspace\//
];

function isUserSurface(path: string): boolean {
  return USER_SURFACE_PATTERNS.some((re) => re.test(path));
}

export interface DetectionScanInput {
  user: AuthUser;
  orgId: string;
  files?: SourceFileInput[];
}

export interface DetectionScanResult {
  detections: AdminDetection[];
  durationMs: number;
  rulesRun: number;
}

export async function runDetectionsScan(input: DetectionScanInput): Promise<DetectionScanResult> {
  assertKillSwitchAllowed("admin_agent");
  assertKillSwitchAllowed("detections_scanner");
  const started = Date.now();
  try {
    const all = input.files ?? loadSelfRepoSnapshot();
    const userSide = all.filter((f) => isUserSurface(f.path));
    const ctx = { files: userSide };
    const drafts = [
      ...ruleRouteAuth(ctx),
      ...ruleOrgScoping(ctx),
      ...ruleClientServerBoundary(ctx),
      ...ruleAuditLog(ctx),
      ...(await ruleSecurityFindings(ctx))
    ];
    const detections: AdminDetection[] = [];
    for (const draft of drafts) {
      detections.push(recordDetection(draft, input.orgId));
    }
    const durationMs = Date.now() - started;
    void recordAudit(
      {
        actor: input.user.id,
        action: "admin_agent.detections_scan",
        detail: `Scanned ${userSide.length} user-side files`,
        metadata: { count: detections.length, durationMs }
      },
      input.orgId
    );
    return { detections, durationMs, rulesRun: 5 };
  } catch (error) {
    void recordAudit(
      {
        actor: input.user.id,
        action: "admin_agent.detections_scan_failed",
        detail: error instanceof Error ? error.message.slice(0, 120) : "scan failed",
        metadata: { reason: error instanceof Error ? error.message : String(error) }
      },
      input.orgId
    );
    throw error;
  }
}
