import type { ChangePlan } from "@/lib/types/core";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

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
}

function classifyDomain(path: string): "frontend" | "backend" | "data" | "tests" | "docs" | "ops" {
  if (/test|spec/i.test(path)) return "tests";
  if (/docs|readme|\.md$/i.test(path)) return "docs";
  if (/api|route|server|auth|middleware/i.test(path)) return "backend";
  if (/db|schema|migration|supabase/i.test(path)) return "data";
  if (/github|workflow|vercel|docker|deploy|infra/i.test(path)) return "ops";
  return "frontend";
}

function inferRequestedDomains(request: string): Set<string> {
  const lowered = request.toLowerCase();
  const domains = new Set<string>();
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

  const usesNewEnv = input.patches.some((patch) => /process\.env\.[A-Z0-9_]+/.test(patch.after) && !/process\.env\.[A-Z0-9_]+/.test(patch.before));
  if (usesNewEnv && !changedDomains.has("docs") && !changedDomains.has("ops")) {
    findings.push({
      severity: "warning",
      message: "New environment variables appear in code, but docs or deployment config were not updated."
    });
  }

  return {
    passed: findings.every((finding) => finding.severity !== "block"),
    blocked: findings.some((finding) => finding.severity === "block"),
    summary: findings.length
      ? "Task completion evaluator found gaps between the request, plan, and generated patch."
      : "Task completion evaluator found no obvious completion gaps.",
    findings,
    coveredDomains: [...changedDomains]
  };
}
