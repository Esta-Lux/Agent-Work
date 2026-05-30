import type { ChangePlan } from "@/lib/types/core";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

const ENV_VAR_PATTERN = /\bprocess\.env\.[A-Z0-9_]+\b/;

export interface TaskCompletionFinding {
  severity: "warning" | "block";
  message: string;
}

export interface TaskCompletionEvaluation {
  passed: boolean;
  blocked: boolean;
  summary: string;
  findings: TaskCompletionFinding[];
  coveredDomains: string[];
  reachabilityChecks: ReachabilityCheck[];
}

export type ReachabilityCheckType =
  | "component_not_imported"
  | "hook_not_used"
  | "route_no_caller"
  | "env_var_undocumented"
  | "db_field_no_migration"
  | "auth_guard_removed"
  | "dead_code_only_changed";

export interface ReachabilityCheck {
  type: ReachabilityCheckType;
  filePath: string;
  detail: string;
  severity: "blocker" | "warning";
}

type TaskDomain = "frontend" | "backend" | "data" | "tests" | "docs" | "ops";

function classifyDomain(path: string): TaskDomain {
  if (/test|spec/i.test(path)) return "tests";
  if (/docs|readme|\.md$/i.test(path)) return "docs";
  if (/api|route|server|auth|middleware/i.test(path)) return "backend";
  if (/db|schema|migration|supabase/i.test(path)) return "data";
  if (/github|workflow|vercel|docker|deploy|infra/i.test(path)) return "ops";
  return "frontend";
}

function inferRequestedDomains(request: string): Set<TaskDomain> {
  const lowered = request.toLowerCase();
  const domains = new Set<TaskDomain>();
  if (/(ui|frontend|page|component|screen)/.test(lowered)) domains.add("frontend");
  if (/(api|backend|server|route|endpoint|auth)/.test(lowered)) domains.add("backend");
  if (/(db|database|migration|schema|supabase|table)/.test(lowered)) domains.add("data");
  if (/(test|verify|coverage|regression)/.test(lowered)) domains.add("tests");
  if (/(deploy|production|ci|release|workflow)/.test(lowered)) domains.add("ops");
  if (/(end-to-end|end to end|full stack|full-stack)/.test(lowered)) {
    domains.add("frontend");
    domains.add("backend");
  }
  return domains;
}

export function evaluateTaskCompletion(input: {
  request: string;
  plan: ChangePlan;
  patches: ProposedPatch[];
}): TaskCompletionEvaluation {
  const findings: TaskCompletionFinding[] = [];
  const changedDomains = new Set(input.patches.map((patch) => classifyDomain(patch.path)));
  const requestedDomains = inferRequestedDomains(input.request);

  if (input.patches.length === 0) {
    findings.push({
      severity: "block",
      message: "No file patches were generated, so the requested code change is not complete."
    });
  }

  const scopedTargets = new Set([
    ...input.plan.impact.files,
    ...input.plan.steps.flatMap((step) => step.targetFiles)
  ]);
  if (scopedTargets.size > 0 && input.patches.length > 0) {
    const untouchedTargets = [...scopedTargets].filter((path) => !input.patches.some((patch) => patch.path === path));
    if (untouchedTargets.length === scopedTargets.size) {
      findings.push({
        severity: "block",
        message: "The generated patch does not touch any of the files the plan marked as in scope."
      });
    }
  }

  for (const domain of requestedDomains) {
    if (!changedDomains.has(domain)) {
      findings.push({
        severity: domain === "tests" ? "warning" : "block",
        message: `The request implies ${domain} work, but the patch set does not cover that area.`
      });
    }
  }

  const touchedBackend = changedDomains.has("backend");
  const touchedFrontend = changedDomains.has("frontend");
  const explicitlyCallsForBothSurfaces =
    /(frontend|ui|component|screen)/i.test(input.request) &&
    /(backend|api|server|route|endpoint)/i.test(input.request);
  if (explicitlyCallsForBothSurfaces && (!touchedBackend || !touchedFrontend)) {
    findings.push({
      severity: "block",
      message: "The request explicitly calls for both frontend and backend work, but the patch set does not cover both surfaces."
    });
  }

  const usesNewEnv = input.patches.some((patch) => ENV_VAR_PATTERN.test(patch.after) && !ENV_VAR_PATTERN.test(patch.before));
  if (usesNewEnv && !changedDomains.has("docs") && !changedDomains.has("ops")) {
    findings.push({
      severity: "warning",
      message: "New environment variables appear in code, but docs or deployment config were not updated."
    });
  }
  const reachabilityChecks = evaluateReachability(input.patches);
  for (const check of reachabilityChecks) {
    findings.push({
      severity: check.severity === "blocker" ? "block" : "warning",
      message: check.detail
    });
  }

  return {
    passed: findings.every((finding) => finding.severity !== "block"),
    blocked: findings.some((finding) => finding.severity === "block"),
    summary: findings.length
      ? "Task completion evaluator found gaps between the request, plan, and generated patch."
      : "Task completion evaluator found no obvious completion gaps.",
    findings,
    coveredDomains: [...changedDomains],
    reachabilityChecks
  };
}

function evaluateReachability(patches: ProposedPatch[]): ReachabilityCheck[] {
  const checks: ReachabilityCheck[] = [];
  const changedPaths = new Set(patches.map((patch) => patch.path));
  const afterCorpus = patches.map((patch) => patch.after).join("\n");

  for (const patch of patches) {
    const isNew = !patch.before.trim() && patch.after.trim();
    const basename = patch.path.split("/").pop()?.replace(/\.(tsx?|jsx?)$/, "") ?? patch.path;
    if (isNew && /components\/.*\.tsx$/i.test(patch.path) && !afterCorpus.includes(`<${basename}`) && !afterCorpus.includes(`from "./${basename}`)) {
      checks.push({
        type: "component_not_imported",
        filePath: patch.path,
        detail: `New component ${patch.path} is not imported or rendered in the changed patch set.`,
        severity: "blocker"
      });
    }
    if (isNew && /use[A-Z].*\.ts$/i.test(basename) && !afterCorpus.includes(`${basename}(`)) {
      checks.push({
        type: "hook_not_used",
        filePath: patch.path,
        detail: `New hook ${patch.path} is not used in the changed patch set.`,
        severity: "warning"
      });
    }
    if (isNew && /\/api\/.*route\.ts$/i.test(patch.path) && !afterCorpus.includes(patch.path.replace(/^src\/app/, "").replace(/\/route\.ts$/, ""))) {
      checks.push({
        type: "route_no_caller",
        filePath: patch.path,
        detail: `New API route ${patch.path} has no changed caller.`,
        severity: "warning"
      });
    }
    if (ENV_VAR_PATTERN.test(patch.after) && !changedPaths.has(".env.example")) {
      checks.push({
        type: "env_var_undocumented",
        filePath: patch.path,
        detail: `Environment variables introduced in ${patch.path} are not documented in .env.example.`,
        severity: "blocker"
      });
    }
    if (/require(Admin|Workspace|Auth)|with(Admin|Workspace)Auth/.test(patch.before) && !/require(Admin|Workspace|Auth)|with(Admin|Workspace)Auth/.test(patch.after)) {
      checks.push({
        type: "auth_guard_removed",
        filePath: patch.path,
        detail: `Auth guard appears to be removed from ${patch.path}.`,
        severity: "blocker"
      });
    }
  }

  if (patches.length > 0 && patches.every((patch) => /unused|dead code/i.test(patch.summary))) {
    checks.push({
      type: "dead_code_only_changed",
      filePath: patches[0]?.path ?? "unknown",
      detail: "Patch set appears to change only dead-code areas.",
      severity: "warning"
    });
  }

  return checks;
}
