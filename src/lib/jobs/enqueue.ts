import type { JobType } from "@/lib/jobs/job-types";
import { saveJob, updateJob, updateJobStatus } from "@/lib/jobs/status-store";
import { indexProjectFiles } from "@/lib/project-brain/file-indexer";
import { buildModuleIndex } from "@/lib/project-brain/module-indexer";
import { runSecurityScanFull } from "@/lib/security/security-scan";
import { evaluateDeploymentReadiness } from "@/lib/deployment/deployment-readiness";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { chargeCredits } from "@/lib/usage/credit-store";
import { estimateCreditsForAction } from "@/lib/usage/credit-pricing";
import { queryProductBrain } from "@/lib/product-brain/product-brain-query";
import type { ProjectBrief } from "@/lib/workspace/workspace-types";
import { runProviderDuel, type ProviderDuelResult } from "@/lib/ai/provider-duel";
import type { ProductBrainContext } from "@/lib/product-brain/product-brain-types";
import { runMultiPassExecutor } from "@/lib/workspace/multi-pass-executor";
import { createWorkUnitRun } from "@/lib/workspace/work-unit-run-store";
import { buildReportFromMultiPassExecution, saveMultiPassPendingFix } from "@/lib/workspace/multi-pass-report-builder";
import type { WorkUnitPlan } from "@/lib/workspace/work-unit-planner";
import { updateAdminBuildMission } from "@/lib/admin-build/admin-build-store";
import { validateSelfAgentBoundary } from "@/lib/agents/admin/self-agent-boundary";
import { getSelfAgentPreview } from "@/lib/agents/admin/self-agent-preview-store";
import { appendLedgerEvent } from "@/lib/workspace/living-ledger-timeline";
import { addArchitectureMemory } from "@/lib/project-brain/memory-updater";

interface EnqueueJobInput {
  type: JobType;
  orgId: string;
  userId: string;
  projectId: string;
  files?: SourceFileInput[];
  repositoryId?: string;
  payload?: {
    brief?: Partial<ProjectBrief>;
    correction?: string;
    task?: string;
    premiumAllowed?: boolean;
    productContext?: ProductBrainContext;
    taskDescription?: string;
    workUnitPlan?: WorkUnitPlan;
    repoFiles?: Array<{ path: string; content: string }>;
    missionId?: string;
    branchName?: string;
  };
}

export async function enqueueJob(input: EnqueueJobInput): Promise<{ jobId: string }> {
  const id = `job_${Date.now()}`;
  const now = new Date().toISOString();
  saveJob({
    id,
    type: input.type,
    orgId: input.orgId,
    projectId: input.projectId,
    repositoryId: input.repositoryId,
    status: "queued",
    progressPercent: 5,
    progressMessage: "Queued",
    createdAt: now,
    updatedAt: now
  });

  void runJobAsync(id, input);
  return { jobId: id };
}

function setProgress(jobId: string, progressPercent: number, progressMessage: string) {
  updateJob(jobId, { progressPercent, progressMessage });
}

async function runJobAsync(jobId: string, input: EnqueueJobInput) {
  updateJobStatus(jobId, "running");
  setProgress(jobId, 15, "Starting");
  try {
    const files = input.files ?? [];

    if (input.type === "repo.index" || input.type === "projectBrain.build") {
      setProgress(jobId, 30, "Indexing project files");
      const index = await indexProjectFiles({
        orgId: input.orgId,
        projectId: input.projectId,
        repositoryId: input.repositoryId,
        files
      });
      setProgress(jobId, 70, "Building module graph");
      const modules = await buildModuleIndex({ orgId: input.orgId, projectId: input.projectId, files });
      const indexAction = "large_repo_scan";
      void chargeCredits({
        orgId: input.orgId,
        userId: input.userId,
        action: indexAction,
        credits: estimateCreditsForAction(indexAction),
        metadata: { taskType: indexAction, projectId: input.projectId }
      });
      updateJob(jobId, {
        status: "completed",
        progressPercent: 100,
        progressMessage: "Completed",
        completedAt: new Date().toISOString(),
        result: { projectBrain: { projectId: input.projectId, filesIndexed: index.entries.length, modules: modules.length } }
      });
      return;
    }

    if (input.type === "productBrain.build") {
      setProgress(jobId, 45, "Building product brain");
      const productBrain = queryProductBrain({
        projectId: input.projectId,
        brief: input.payload?.brief,
        files,
        correction: input.payload?.correction
      });
      updateJob(jobId, {
        status: "completed",
        progressPercent: 100,
        progressMessage: "Completed",
        completedAt: new Date().toISOString(),
        result: { productBrain }
      });
      return;
    }

    if (input.type === "security.scan") {
      setProgress(jobId, 45, "Running security scan");
      const { findings, score, semgrep } = await runSecurityScanFull(files);
      const criticalCount = findings.filter((f) => f.severity === "critical" || f.blocksDeployment).length;
      if (input.projectId) {
        void appendLedgerEvent(
          input.projectId,
          {
            kind: "security_scan",
            title: "Security scan completed",
            narrative: `${findings.length} findings (${criticalCount} critical), score ${score}`
          },
          input.orgId
        );
        for (const f of findings.filter((x) => x.severity === "critical" || x.severity === "high").slice(0, 5)) {
          void addArchitectureMemory({
            orgId: input.orgId,
            projectId: input.projectId,
            title: `Security: ${f.title}`,
            content: `${f.whyItMatters} Fix: ${f.recommendedFix}`,
            type: "rule",
            relatedPaths: f.file ? [f.file] : []
          }).catch(() => {});
        }
      }
      const scanAction = "basic_security_scan";
      void chargeCredits({
        orgId: input.orgId,
        userId: input.userId,
        action: scanAction,
        credits: estimateCreditsForAction(scanAction),
        metadata: { taskType: scanAction, projectId: input.projectId }
      });
      updateJob(jobId, {
        status: "completed",
        progressPercent: 100,
        progressMessage: "Completed",
        completedAt: new Date().toISOString(),
        result: { findings, criticalCount, score, semgrep, estimatedCredits: estimateCreditsForAction(scanAction) }
      });
      return;
    }

    if (input.type === "deployment.readiness") {
      setProgress(jobId, 50, "Evaluating deployment readiness");
      const report = evaluateDeploymentReadiness(files);
      const deployAction = "deployment_readiness";
      void chargeCredits({
        orgId: input.orgId,
        userId: input.userId,
        action: deployAction,
        credits: estimateCreditsForAction(deployAction),
        metadata: { taskType: deployAction, projectId: input.projectId }
      });
      updateJob(jobId, {
        status: "completed",
        progressPercent: 100,
        progressMessage: "Completed",
        completedAt: new Date().toISOString(),
        result: { report, estimatedCredits: estimateCreditsForAction(deployAction) }
      });
      return;
    }

    if (input.type === "provider.duel") {
      setProgress(jobId, 40, "Running provider duel");
      const duel = await runProviderDuel({
        task: input.payload?.task ?? "",
        files,
        premiumAllowed: input.payload?.premiumAllowed,
        productContext: input.payload?.productContext
      });
      updateJob(jobId, {
        status: "completed",
        progressPercent: 100,
        progressMessage: "Completed",
        completedAt: new Date().toISOString(),
        result: { results: (duel.results ?? []) as ProviderDuelResult[] }
      });
      return;
    }

    if (input.type === "multiPass.execute") {
      const taskDescription = input.payload?.taskDescription?.trim() ?? "";
      if (!taskDescription || !input.payload?.workUnitPlan || !Array.isArray(input.payload.repoFiles) || input.payload.repoFiles.length === 0) {
        throw new Error("taskDescription, workUnitPlan, and repoFiles are required.");
      }
      setProgress(jobId, 35, "Executing multi-pass");
      const result = await runMultiPassExecutor({
        taskDescription,
        workUnitPlan: input.payload.workUnitPlan,
        repoFiles: input.payload.repoFiles,
        repositoryId: input.repositoryId,
        orgId: input.orgId,
        projectId: input.projectId,
        userId: input.userId
      });
      setProgress(jobId, 75, "Persisting work-unit run");
      const run = createWorkUnitRun({
        orgId: input.orgId,
        projectId: input.projectId,
        repositoryId: input.repositoryId,
        taskDescription,
        workUnitPlan: input.payload.workUnitPlan,
        repoFiles: input.payload.repoFiles,
        result
      });
      const report = buildReportFromMultiPassExecution({
        execution: result,
        taskDescription,
        repositoryId: input.repositoryId,
        workUnitPlan: input.payload.workUnitPlan
      });
      saveMultiPassPendingFix({
        report,
        execution: result,
        taskDescription,
        repoFiles: input.payload.repoFiles,
        orgId: input.orgId,
        projectId: input.projectId
      });
      updateJob(jobId, {
        status: "completed",
        progressPercent: 100,
        progressMessage: "Completed",
        completedAt: new Date().toISOString(),
        result: { result, runId: run.id, report }
      });
      return;
    }

    if (input.type === "selfAgent.verify") {
      setProgress(jobId, 30, "Validating mission boundaries");
      const boundary = validateSelfAgentBoundary({ missionId: input.payload?.missionId, branchName: input.payload?.branchName });
      if (!boundary.ok || !boundary.mission) {
        throw new Error(boundary.message ?? "Mission validation failed.");
      }
      const mission = boundary.mission;
      if (mission.status !== "approved" && mission.status !== "branch_pushed" && mission.status !== "pr_opened") {
        throw new Error("Approve the mission before running verify.");
      }
      setProgress(jobId, 65, "Running self-agent guard checks");
      const preview = getSelfAgentPreview(mission.id);
      if (!preview) throw new Error("Patch preview not found for mission.");
      const verify = {
        passed: preview.blockers.length === 0,
        commands: [
          {
            label: "self-agent-guard",
            exitCode: preview.blockers.length === 0 ? 0 : 1,
            output:
              preview.blockers.length === 0
                ? "Guard checks passed for self-agent patch preview."
                : preview.blockers.join("\n")
          },
          {
            label: "self-agent-diff-scope",
            exitCode: 0,
            output: `Patch count: ${preview.patches.length}. Branch: ${preview.branchName}.`
          }
        ]
      };
      const updatedMission = updateAdminBuildMission(
        mission.id,
        {
          status: verify.passed ? "branch_pushed" : "guard_check",
          branchName: preview.branchName
        },
        input.userId
      );
      updateJob(jobId, {
        status: "completed",
        progressPercent: 100,
        progressMessage: "Completed",
        completedAt: new Date().toISOString(),
        result: { mission: updatedMission ?? mission, verify }
      });
      return;
    }

    throw new Error(`Unsupported job type: ${input.type}`);
  } catch (error) {
    updateJob(jobId, {
      status: "failed",
      progressPercent: 100,
      progressMessage: "Failed",
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Job failed"
    });
  }
}
