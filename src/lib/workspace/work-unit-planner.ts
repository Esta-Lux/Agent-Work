import { evaluateVagueOutputGuard } from "@/lib/control/vague-output-guard";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export type WorkUnitDomain =
  | "backend_api"
  | "frontend_ui"
  | "database_rls"
  | "auth_policy"
  | "tests"
  | "docs_deploy"
  | "security";

export interface WorkUnit {
  id: string;
  domain: WorkUnitDomain;
  title: string;
  description: string;
  targetFiles: string[];
  readOnlyFiles: string[];
  dependsOn: string[];
  estimatedComplexity: "low" | "medium" | "high";
  acceptanceCriteria: string[];
}

export interface WorkUnitPlan {
  taskSummary: string;
  totalUnits: number;
  units: WorkUnit[];
  executionOrder: string[][];
  crossFileDependencyWarnings: string[];
  estimatedRiskLevel: "low" | "medium" | "high";
  requiresMultiPass: boolean;
}

export interface WorkUnitPlannerInput {
  taskDescription: string;
  scopedFiles: string[];
  repoFiles: Array<{ path: string; content: string }>;
  projectBrainContext?: string;
}

export function planWorkUnits(input: WorkUnitPlannerInput): WorkUnitPlan {
  const task = input.taskDescription.trim();
  if (!task) throw new Error("taskDescription is required.");

  const targetFiles = chooseFiles(input);
  if (targetFiles.length === 0) {
    throw new Error("Work unit planning needs at least one concrete target file.");
  }

  const grouped = groupFiles(targetFiles);
  const units = [...grouped.entries()].map(([domain, files], index) =>
    createWorkUnit({
      id: `wu_${index + 1}`,
      domain,
      task,
      targetFiles: files,
      repoFiles: input.repoFiles,
      dependsOn: index === 0 ? [] : [`wu_${index}`]
    })
  );

  const warnings = buildDependencyWarnings(units);
  const requiresMultiPass = units.length > 1 || targetFiles.length >= 3 || /multi|across|flow|auth|billing|database|admin|security/i.test(task);
  const plan: WorkUnitPlan = {
    taskSummary: `Scoped task "${task.slice(0, 140)}" across ${targetFiles.length} file${targetFiles.length === 1 ? "" : "s"}.`,
    totalUnits: units.length,
    units,
    executionOrder: units.length <= 1 ? [units.map((unit) => unit.id)] : units.map((unit) => [unit.id]),
    crossFileDependencyWarnings: warnings,
    estimatedRiskLevel: estimatePlanRisk(units),
    requiresMultiPass
  };

  const guard = evaluateVagueOutputGuard([
    {
      path: "work-unit-plan",
      before: "",
      after: [
        plan.taskSummary,
        ...plan.units.flatMap((unit) => [unit.title, unit.description, ...unit.acceptanceCriteria, ...unit.targetFiles])
      ].join("\n"),
      summary: plan.taskSummary
    } satisfies ProposedPatch
  ]);

  if (guard.blocked) {
    const finding = guard.findings[0];
    throw new Error(finding?.message ?? "Work unit plan is too vague.");
  }

  return plan;
}

function chooseFiles(input: WorkUnitPlannerInput): string[] {
  const scoped = input.scopedFiles.filter(Boolean);
  if (scoped.length > 0) return uniqueExisting(scoped, input.repoFiles).slice(0, 12);

  const task = input.taskDescription.toLowerCase();
  const scored = input.repoFiles
    .map((file) => ({ path: file.path, score: scoreFile(file.path, file.content, task) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .map((item) => item.path);

  return scored.slice(0, 8);
}

function uniqueExisting(paths: string[], repoFiles: Array<{ path: string }>): string[] {
  const known = new Set(repoFiles.map((file) => file.path));
  return [...new Set(paths)].filter((path) => known.has(path));
}

function scoreFile(path: string, content: string, task: string): number {
  const lowerPath = path.toLowerCase();
  const lowerContent = content.toLowerCase();
  let score = 0;
  for (const token of task.split(/[^a-z0-9_/.-]+/).filter((part) => part.length > 3)) {
    if (lowerPath.includes(token)) score += 4;
    if (lowerContent.includes(token)) score += 1;
  }
  if (/api|route|endpoint/.test(task) && /\/api\/|route\.ts/.test(lowerPath)) score += 5;
  if (/ui|page|button|layout|screen/.test(task) && /component|page\.tsx|layout\.tsx/.test(lowerPath)) score += 5;
  if (/auth|login|session|role/.test(task) && /auth|middleware|session/.test(lowerPath)) score += 6;
  if (/billing|stripe|payment|credit/.test(task) && /billing|stripe|usage|credit/.test(lowerPath)) score += 6;
  if (/data|table|supabase|migration/.test(task) && /supabase|schema|store|data/.test(lowerPath)) score += 5;
  if (/test|verify/.test(task) && /\.test\.|\/test/.test(lowerPath)) score += 4;
  return score;
}

function groupFiles(paths: string[]): Map<WorkUnitDomain, string[]> {
  const grouped = new Map<WorkUnitDomain, string[]>();
  for (const path of paths) {
    const domain = inferDomain(path);
    grouped.set(domain, [...(grouped.get(domain) ?? []), path]);
  }
  return grouped;
}

function createWorkUnit(input: {
  id: string;
  domain: WorkUnitDomain;
  task: string;
  targetFiles: string[];
  repoFiles: Array<{ path: string; content: string }>;
  dependsOn: string[];
}): WorkUnit {
  return {
    id: input.id,
    domain: input.domain,
    title: `${domainTitle(input.domain)} changes`,
    description: `Apply the scoped task to ${input.targetFiles.join(", ")} while preserving nearby contracts and existing behavior.`,
    targetFiles: input.targetFiles,
    readOnlyFiles: pickReadOnlyFiles(input.domain, input.repoFiles, input.targetFiles),
    dependsOn: input.dependsOn,
    estimatedComplexity: input.targetFiles.length > 3 ? "high" : input.targetFiles.length > 1 ? "medium" : "low",
    acceptanceCriteria: input.targetFiles.map((path) => `${path} satisfies the requested behavior without widening scope beyond this work unit.`)
  };
}

function pickReadOnlyFiles(domain: WorkUnitDomain, repoFiles: Array<{ path: string }>, targetFiles: string[]): string[] {
  const target = new Set(targetFiles);
  return repoFiles
    .map((file) => file.path)
    .filter((path) => !target.has(path))
    .filter((path) => {
      const lower = path.toLowerCase();
      if (domain === "backend_api") return /workspace-types|types\.ts|auth|control|model-router/.test(lower);
      if (domain === "frontend_ui") return /tailwind|globals|layout|components\/ui/.test(lower);
      if (domain === "database_rls") return /supabase|schema|migration|store/.test(lower);
      if (domain === "auth_policy") return /auth|middleware|session/.test(lower);
      if (domain === "security") return /security|guard|boundary|auth/.test(lower);
      if (domain === "tests") return /package\.json|tsconfig|jest|vitest|playwright/.test(lower);
      return /readme|docs|deploy|vercel|fly/.test(lower);
    })
    .slice(0, 6);
}

function inferDomain(path: string): WorkUnitDomain {
  const lower = path.toLowerCase();
  if (/auth|middleware|session|role|policy/.test(lower)) return "auth_policy";
  if (/supabase|migration|rls|schema|database/.test(lower)) return "database_rls";
  if (/security|guard|boundary|scanner/.test(lower)) return "security";
  if (/\.test\.|\/test|spec/.test(lower)) return "tests";
  if (/docs|readme|vercel|fly|deploy|ci|workflow/.test(lower)) return "docs_deploy";
  if (/\/api\/|route\.ts|server|lib\//.test(lower)) return "backend_api";
  return "frontend_ui";
}

function domainTitle(domain: WorkUnitDomain): string {
  return domain.replace(/_/g, " ");
}

function buildDependencyWarnings(units: WorkUnit[]): string[] {
  const warnings: string[] = [];
  if (units.some((unit) => unit.domain === "database_rls") && units.some((unit) => unit.domain === "backend_api")) {
    warnings.push("Database work should land before API callers that depend on new tables or fields.");
  }
  if (units.some((unit) => unit.domain === "auth_policy") && units.some((unit) => unit.domain === "frontend_ui")) {
    warnings.push("Auth policy changes may alter frontend route visibility and should be verified together.");
  }
  return warnings;
}

function estimatePlanRisk(units: WorkUnit[]): "low" | "medium" | "high" {
  if (units.some((unit) => unit.domain === "auth_policy" || unit.domain === "database_rls" || unit.domain === "security")) return "high";
  if (units.length > 1 || units.some((unit) => unit.estimatedComplexity !== "low")) return "medium";
  return "low";
}
