import { evaluateTaskCompletion } from "@/lib/control/task-completion-evaluator";
import { evaluateVagueOutputGuard } from "@/lib/control/vague-output-guard";
import type { SelfAgentWorkUnit } from "@/lib/agents/admin/self-agent-architect";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import type { ChangePlan } from "@/lib/types/core";

export interface SelfAgentPatchRequest {
  missionId: string;
  workUnit: SelfAgentWorkUnit;
  patchedFiles: Array<{ path: string; before: string; after: string }>;
  repoFiles: Array<{ path: string; content: string }>;
  envExampleContent: string;
}

export interface SelfAgentPatchValidation {
  missionId: string;
  workUnitId: string;
  controlGateResult: unknown;
  reachabilityChecks: unknown[];
  vagueOutputViolations: string[];
  approved: boolean;
  blockers: string[];
  warnings: string[];
}

export function validateSelfAgentPatch(input: SelfAgentPatchRequest): SelfAgentPatchValidation {
  const patches: ProposedPatch[] = input.patchedFiles.map((file) => ({
    path: file.path,
    before: file.before,
    after: file.after,
    summary: `Self-agent work unit ${input.workUnit.id} changes ${file.path}.`
  }));

  const vague = evaluateVagueOutputGuard(patches);
  const reachabilityChecks = runReachabilityChecks(input);
  const plan = buildSyntheticChangePlan(input);
  const completion = evaluateTaskCompletion({
    request: input.workUnit.description,
    plan,
    patches
  });

  const blockers = [
    ...vague.findings.filter((finding) => finding.severity === "block").map((finding) => finding.message),
    ...reachabilityChecks.filter((check) => check.severity === "blocker").map((check) => check.detail),
    ...completion.findings.filter((finding) => finding.severity === "block").map((finding) => finding.message)
  ];
  const warnings = [
    ...vague.findings.filter((finding) => finding.severity === "warning").map((finding) => finding.message),
    ...reachabilityChecks.filter((check) => check.severity === "warning").map((check) => check.detail),
    ...completion.findings.filter((finding) => finding.severity === "warning").map((finding) => finding.message)
  ];

  return {
    missionId: input.missionId,
    workUnitId: input.workUnit.id,
    controlGateResult: completion,
    reachabilityChecks,
    vagueOutputViolations: vague.findings.map((finding) => finding.message),
    approved: blockers.length === 0,
    blockers,
    warnings
  };
}

function runReachabilityChecks(input: SelfAgentPatchRequest): Array<{ type: string; filePath: string; detail: string; severity: "blocker" | "warning" }> {
  const checks: Array<{ type: string; filePath: string; detail: string; severity: "blocker" | "warning" }> = [];
  const repoPaths = new Set(input.repoFiles.map((file) => file.path));

  for (const patch of input.patchedFiles) {
    if (!input.workUnit.targetFiles.includes(patch.path)) {
      checks.push({
        type: "out_of_scope_file",
        filePath: patch.path,
        detail: `${patch.path} is not listed in the approved work unit target files.`,
        severity: "blocker"
      });
    }
    if (/process\.env\.[A-Z0-9_]+/.test(patch.after) && !input.envExampleContent.trim()) {
      checks.push({
        type: "env_var_undocumented",
        filePath: patch.path,
        detail: `${patch.path} references environment variables but .env.example content was not supplied.`,
        severity: "blocker"
      });
    }
    if (/components\/.*\.tsx$/.test(patch.path) && ![...repoPaths].some((path) => path !== patch.path && path.endsWith(".tsx"))) {
      checks.push({
        type: "component_not_imported",
        filePath: patch.path,
        detail: `${patch.path} appears to be isolated; verify it is imported before execution.`,
        severity: "warning"
      });
    }
  }

  return checks;
}

function buildSyntheticChangePlan(input: SelfAgentPatchRequest): ChangePlan {
  return {
    id: `${input.missionId}_${input.workUnit.id}`,
    intent: {
      request: input.workUnit.description,
      interpretedGoal: input.workUnit.label,
      businessImpact: "BootRise self-improvement remains scoped and approval-gated."
    },
    impact: {
      files: input.workUnit.targetFiles,
      services: ["admin-self-agent"],
      apis: [],
      databaseSchemas: [],
      blastRadius: input.workUnit.readOnlyFiles
    },
    risk: {
      level: input.workUnit.riskLevel,
      reasons: [`Self-agent ${input.workUnit.domain} work requires admin review.`]
    },
    steps: [
      {
        id: input.workUnit.id,
        title: input.workUnit.label,
        domain: input.workUnit.domain === "frontend" ? "frontend" : input.workUnit.domain === "data" ? "database" : input.workUnit.domain === "tests" ? "tests" : "backend",
        summary: input.workUnit.description,
        targetFiles: input.workUnit.targetFiles,
        dependsOn: []
      }
    ],
    validations: [
      {
        id: "self-agent-control-bridge",
        kind: "api-contract",
        title: "Self-Agent patch validation",
        status: "pending"
      }
    ],
    rollbackStrategy: "Reject the mission patch preview or discard the self-agent branch before merge."
  };
}
