export type DetectionKind =
  | "auth_missing"
  | "org_scoping_missing"
  | "client_server_boundary"
  | "audit_log_missing"
  | "kill_switch_bypass"
  | "runtime_failure_cluster"
  | "usage_failure_spike"
  | "pending_fix_failure"
  | "security_finding";

export type DetectionSeverity = "info" | "warning" | "critical";

export type DetectionStatus = "new" | "acknowledged" | "resolved" | "false_positive";

export type DetectionSource = "scanner" | "watchdog";

export interface AdminDetection {
  id: string;
  kind: DetectionKind;
  severity: DetectionSeverity;
  title: string;
  description: string;
  affectedPaths?: string[];
  evidence?: Record<string, string | number>;
  suggestedAction?: string;
  suggestedFixRequest?: string;
  detectedAt: string;
  source: DetectionSource;
  status: DetectionStatus;
}

export type DetectionDraft = Omit<AdminDetection, "id" | "detectedAt" | "status">;
