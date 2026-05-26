export type SecurityFindingSeverity = "critical" | "high" | "medium" | "low";

export type SecurityFindingCategory =
  | "secret"
  | "auth"
  | "authorization"
  | "database"
  | "deployment"
  | "dependency"
  | "logging"
  | "payment"
  | "api";

export interface SecurityFinding {
  id: string;
  severity: SecurityFindingSeverity;
  category: SecurityFindingCategory;
  file?: string;
  title: string;
  whyItMatters: string;
  evidence?: string;
  recommendedFix: string;
  blocksDeployment: boolean;
  autoFixAvailable: boolean;
}

export interface DeploymentReadinessResult {
  score: number;
  status: "blocked" | "needs_review" | "safe_for_staging" | "production_candidate" | "production_ready";
  blockers: SecurityFinding[];
  warnings: SecurityFinding[];
  passedChecks: string[];
  missingProductionItems: string[];
}
