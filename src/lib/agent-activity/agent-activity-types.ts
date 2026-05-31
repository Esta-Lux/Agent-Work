export type AgentActivityActor =
  | "architect_agent"
  | "project_brain_agent"
  | "product_brain_agent"
  | "context_agent"
  | "builder_agent"
  | "security_agent"
  | "qa_agent"
  | "deployment_agent"
  | "self_agent"
  | "system";

export type AgentActivityEventType =
  | "repository_import_started"
  | "repository_import_completed"
  | "project_brain_started"
  | "project_brain_completed"
  | "product_brain_started"
  | "product_brain_completed"
  | "roadmap_started"
  | "roadmap_completed"
  | "work_unit_plan_started"
  | "work_unit_plan_completed"
  | "multi_pass_started"
  | "work_unit_started"
  | "work_unit_completed"
  | "work_unit_blocked"
  | "multi_pass_completed"
  | "fix_started"
  | "fix_report_generated"
  | "patch_approved"
  | "patch_rejected"
  | "security_scan_started"
  | "security_scan_completed"
  | "deploy_readiness_started"
  | "deploy_readiness_completed"
  | "verify_started"
  | "verify_completed"
  | "pr_prepared"
  | "pr_created";

export type AgentActivityStatus = "pending" | "running" | "success" | "warning" | "failed";

export interface AgentActivityEvent {
  id: string;
  projectId: string;
  jobId?: string;
  runId?: string;
  workUnitId?: string;
  actor: AgentActivityActor;
  type: AgentActivityEventType;
  status: AgentActivityStatus;
  title: string;
  detail?: string;
  filePaths?: string[];
  command?: string;
  exitCode?: number;
  durationMs?: number;
  outputPreview?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
