export type AdminBuildTargetSurface =
  | "user_workspace"
  | "admin_console"
  | "repo_explorer"
  | "project_brain"
  | "security_center"
  | "provider_duel"
  | "admin_readiness"
  | "custom";

export type AdminBuildStatus =
  | "draft"
  | "scoped"
  | "patch_preview"
  | "guard_check"
  | "pending_approval"
  | "approved"
  | "branch_pushed"
  | "pr_opened"
  | "rejected"
  | "cancelled";

export type AdminBuildRiskLevel = "low" | "medium" | "high" | "critical";

export interface AdminBuildMission {
  id: string;
  title: string;
  targetSurface: AdminBuildTargetSurface;
  objective: string;
  affectedFiles: string[];
  forbiddenFiles: string[];
  acceptanceCriteria: string[];
  riskLevel: AdminBuildRiskLevel;
  status: AdminBuildStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  generatedFrom?: "template" | "ai_chat" | "manual";
  patchPreviewId?: string;
  prUrl?: string;
  branchName?: string;
  events?: AdminBuildEvent[];
  scopeContract?: AdminBuildScopeContract;
  guardResults?: AdminBuildGuardResults;
}

export interface AdminBuildScopeContract {
  summary: string;
  filesInScope: string[];
  filesOutOfScope: string[];
  assumptions: string[];
  estimatedComplexity: "simple" | "moderate" | "complex";
  estimatedFiles: number;
}

export interface AdminBuildGuardResults {
  passed: boolean;
  checks: AdminBuildGuardCheck[];
  timestamp: string;
}

export interface AdminBuildGuardCheck {
  name: string;
  passed: boolean;
  message?: string;
  severity: "info" | "warning" | "error";
}

export interface AdminBuildEvent {
  id: string;
  type: AdminBuildStatus;
  message: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface AdminBuildTemplate {
  id: string;
  name: string;
  description: string;
  targetSurface: AdminBuildTargetSurface;
  objective: string;
  likelyFiles: string[];
  forbiddenFiles: string[];
  acceptanceCriteria: string[];
  riskLevel: AdminBuildRiskLevel;
  promptStarter: string;
}

export interface CreateAdminBuildMissionInput {
  title: string;
  targetSurface: AdminBuildTargetSurface;
  objective: string;
  affectedFiles?: string[];
  forbiddenFiles?: string[];
  acceptanceCriteria?: string[];
  riskLevel?: AdminBuildRiskLevel;
  generatedFrom?: "template" | "ai_chat" | "manual";
}

export interface UpdateAdminBuildMissionInput {
  title?: string;
  objective?: string;
  affectedFiles?: string[];
  forbiddenFiles?: string[];
  acceptanceCriteria?: string[];
  riskLevel?: AdminBuildRiskLevel;
  status?: AdminBuildStatus;
  patchPreviewId?: string;
  prUrl?: string;
  branchName?: string;
  scopeContract?: AdminBuildScopeContract;
  guardResults?: AdminBuildGuardResults;
  events?: AdminBuildEvent[];
}
