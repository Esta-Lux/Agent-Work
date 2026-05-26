export type JobType =
  | "repo.index"
  | "projectBrain.build"
  | "security.scan"
  | "deployment.readiness";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface BootriseJob {
  id: string;
  type: JobType;
  orgId: string;
  projectId: string;
  status: JobStatus;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
