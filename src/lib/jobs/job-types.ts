export type JobType =
  | "repo.index"
  | "projectBrain.build"
  | "productBrain.build"
  | "security.scan"
  | "deployment.readiness"
  | "provider.duel"
  | "multiPass.execute"
  | "selfAgent.verify";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface BootriseJob {
  id: string;
  type: JobType;
  orgId: string;
  projectId: string;
  status: JobStatus;
  repositoryId?: string;
  progressPercent?: number;
  progressMessage?: string;
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
