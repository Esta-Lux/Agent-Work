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
import { recordAgentActivityEvent, type AgentActivityActor, type AgentActivityStatus, type AgentEventType } from "@/lib/workspace/agent-activity";

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
  syncJobActivity(id, input, { status: "pending", timestamp: now });

  void runJobAsync(id, input);
  return { jobId: id };
}

function setProgress(jobId: string, progressPercent: number, progressMessage: string) {
  updateJob(jobId, { progressPercent, progressMessage });
}

async function runJobAsync(jobId: string, input: EnqueueJobInput) {
  const startedAt = Date.now();
  updateJobStatus(jobId, "running");
  syncJobActivity(jobId, input, { status: "running" });
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
      syncJobActivity(jobId, input, {
        status: "success",
        durationMs: Date.now() - startedAt,
        detail: `Indexed ${index.entries.length} files and built ${modules.length} modules.`
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
      syncJobActivity(jobId, input, {
        status: "success",
        durationMs: Date.now() - startedAt,
        detail: `Tracked ${productBrain.primaryWorkflows.length} workflows and ${productBrain.policies.length} policies.`
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
      syncJobActivity(jobId, input, {
        status: criticalCount > 0 ? "warning" : "success",
        type: "security_scan_completed",
        durationMs: Date.now() - startedAt,
        detail: `${findings.length} findings, ${criticalCount} critical blockers, score ${score}.`,
        filePaths: findings.map((finding) => finding.file).filter(Boolean) as string[]
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
      syncJobActivity(jobId, input, {
        status: report.status === "ready" ? "success" : "warning",
        durationMs: Date.now() - startedAt,
        detail: `Deployment readiness is ${report.status.replace(/_/g, " ")} with ${report.blockers.length} blocker(s).`,
        filePaths: report.blockers.map((blocker) => blocker.file).filter(Boolean) as string[]
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
      syncJobActivity(jobId, input, {
        status: "success",
        durationMs: Date.now() - startedAt,
        detail: `Compared ${duel.results?.length ?? 0} provider responses.`
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
      syncJobActivity(jobId, input, {
        status: result.status === "blocked" ? "warning" : "success",
        type: result.status === "blocked" ? "work_unit_blocked" : "work_unit_completed",
        durationMs: Date.now() - startedAt,
        detail:
          result.status === "blocked"
            ? result.blockers[0] ?? "Multi-pass execution was blocked."
            : `${result.executions.length} work unit(s) executed and ${report.patches.length} patch(es) prepared.`,
        runId: run.id,
        filePaths: report.patches.map((patch) => patch.path)
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
      syncJobActivity(jobId, input, {
        status: verify.passed ? "success" : "warning",
        type: "test_completed",
        durationMs: Date.now() - startedAt,
        detail: verify.passed ? "Self-agent guard checks passed." : "Self-agent guard checks reported blockers.",
        outputPreview: verify.commands.map((command) => `${command.label} (${command.exitCode})\n${command.output}`).join("\n\n")
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
    syncJobActivity(jobId, input, {
      status: "failed",
      durationMs: Date.now() - startedAt,
      detail: error instanceof Error ? error.message : "Job failed"
    });
  }
}

function syncJobActivity(
  jobId: string,
  input: EnqueueJobInput,
  patch: {
    status: AgentActivityStatus;
    type?: AgentEventType;
    timestamp?: string;
    detail?: string;
    durationMs?: number;
    filePaths?: string[];
    outputPreview?: string;
    runId?: string;
  }
) {
  const descriptor = describeJobActivity(input.type);
  if (!descriptor || !input.projectId) return;
  recordAgentActivityEvent({
    id: `job_activity_${jobId}`,
    projectId: input.projectId,
    jobId,
    runId: patch.runId,
    actor: descriptor.actor,
    type: patch.type ?? descriptor.type,
    status: patch.status,
    title: descriptor.title,
    detail: patch.detail ?? descriptor.detail,
    filePaths: patch.filePaths,
    durationMs: patch.durationMs,
    outputPreview: patch.outputPreview,
    metadata: {
      jobType: input.type,
      ...(input.repositoryId ? { repositoryId: input.repositoryId } : {})
    },
    timestamp: patch.timestamp
  });
}

function describeJobActivity(type: JobType): {
  actor: AgentActivityActor;
  type: AgentEventType;
  title: string;
  detail: string;
} | null {
  switch (type) {
    case "repo.index":
    case "projectBrain.build":
      return {
        actor: "project_brain_agent",
        type: "progress_update",
        title: "Project Brain indexing",
        detail: "Building repository structure and symbol maps."
      };
    case "productBrain.build":
      return {
        actor: "project_brain_agent",
        type: "progress_update",
        title: "Product Brain refresh",
        detail: "Refreshing product memory from the brief and repo context."
      };
    case "security.scan":
      return {
        actor: "security_agent",
        type: "security_scan_started",
        title: "Security scan running",
        detail: "Reviewing files for deploy blockers and risky patterns."
      };
    case "deployment.readiness":
      return {
        actor: "deployment_agent",
        type: "progress_update",
        title: "Deployment readiness check",
        detail: "Checking blockers, score, and release readiness."
      };
    case "provider.duel":
      return {
        actor: "architect_agent",
        type: "progress_update",
        title: "Provider duel running",
        detail: "Comparing BootRise and ChatGPT task plans."
      };
    case "multiPass.execute":
      return {
        actor: "builder_agent",
        type: "work_unit_started",
        title: "Multi-pass execution running",
        detail: "Executing planned work units in sequence."
      };
    case "selfAgent.verify":
      return {
        actor: "qa_agent",
        type: "test_started",
        title: "Guard verification running",
        detail: "Running self-agent safety checks."
      };
    default:
      return null;
  }
}
