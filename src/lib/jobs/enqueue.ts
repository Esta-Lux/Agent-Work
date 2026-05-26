import type { JobType } from "@/lib/jobs/job-types";
import { saveJob, updateJobStatus } from "@/lib/jobs/status-store";
import { indexProjectFiles } from "@/lib/project-brain/file-indexer";
import { buildModuleIndex } from "@/lib/project-brain/module-indexer";
import { runSecurityScan } from "@/lib/security/security-scan";
import { evaluateDeploymentReadiness } from "@/lib/deployment/deployment-readiness";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { chargeCredits } from "@/lib/usage/credit-store";
import { estimateCreditsForAction } from "@/lib/usage/credit-pricing";

export async function enqueueJob(input: {
  type: JobType;
  orgId: string;
  userId: string;
  projectId: string;
  files?: SourceFileInput[];
  repositoryId?: string;
}): Promise<{ jobId: string }> {
  const id = `job_${Date.now()}`;
  const now = new Date().toISOString();
  saveJob({
    id,
    type: input.type,
    orgId: input.orgId,
    projectId: input.projectId,
    status: "queued",
    createdAt: now,
    updatedAt: now
  });

  void runJobAsync(id, input);
  return { jobId: id };
}

async function runJobAsync(
  jobId: string,
  input: {
    type: JobType;
    orgId: string;
    userId: string;
    projectId: string;
    files?: SourceFileInput[];
    repositoryId?: string;
  }
) {
  updateJobStatus(jobId, "running");
  try {
    const files = input.files ?? [];
    if (input.type === "repo.index" || input.type === "projectBrain.build") {
      await indexProjectFiles({
        orgId: input.orgId,
        projectId: input.projectId,
        repositoryId: input.repositoryId,
        files
      });
      await buildModuleIndex({ orgId: input.orgId, projectId: input.projectId, files });
      const indexAction = "large_repo_scan";
      void chargeCredits({
        orgId: input.orgId,
        userId: input.userId,
        action: indexAction,
        credits: estimateCreditsForAction(indexAction),
        metadata: { taskType: indexAction, projectId: input.projectId }
      });
    }
    if (input.type === "security.scan") {
      runSecurityScan(files);
      const scanAction = "basic_security_scan";
      void chargeCredits({
        orgId: input.orgId,
        userId: input.userId,
        action: scanAction,
        credits: estimateCreditsForAction(scanAction),
        metadata: { taskType: scanAction, projectId: input.projectId }
      });
    }
    if (input.type === "deployment.readiness") {
      evaluateDeploymentReadiness(files);
      const deployAction = "deployment_readiness";
      void chargeCredits({
        orgId: input.orgId,
        userId: input.userId,
        action: deployAction,
        credits: estimateCreditsForAction(deployAction),
        metadata: { taskType: deployAction, projectId: input.projectId }
      });
    }
    updateJobStatus(jobId, "completed");
  } catch (error) {
    updateJobStatus(jobId, "failed", error instanceof Error ? error.message : "Job failed");
  }
}
