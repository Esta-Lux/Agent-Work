import type { ChangePlan } from "@/lib/types/core";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { isTestPath } from "@/lib/workspace/file-ranking";
import type { ScopeContract, ControlTaskType } from "@/lib/control/types";
import { isWorkIntent } from "@/lib/control/context-gate";
import { isRepoOverviewQuestion } from "@/lib/workspace/repo-overview";

const DEFAULT_FORBIDDEN = [
  "**/.env*",
  "**/.env.*",
  "**/credentials*",
  "**/secrets*",
  "**/*secret*"
];

const SENSITIVE_ZONES = ["auth", "billing", "payment", "stripe", "migration", "sql/0"];

export function inferTaskType(request: string): ControlTaskType {
  const n = request.toLowerCase();
  if (isRepoOverviewQuestion(request) || (!isWorkIntent(request) && /\b(what|explain|describe|how does|why)\b/.test(n))) {
    return "review";
  }
  if (/\b(refactor|restructure|rewrite)\b/.test(n)) return "refactor";
  if (/\b(add|new feature|implement|build)\b/.test(n)) return "feature";
  if (/\b(fix|bug|broken|wrong|not working|error)\b/.test(n)) return "bug_fix";
  return "review";
}

export function inferDiffBudget(taskType: ControlTaskType, request: string): {
  maxFiles: number;
  maxLines: number;
  maxNewFiles: number;
  maxNewDependencies: number;
} {
  const n = request.toLowerCase();
  if (/\b(small|tiny|one file|single file)\b/.test(n)) {
    return { maxFiles: 3, maxLines: 120, maxNewFiles: 1, maxNewDependencies: 0 };
  }
  if (taskType === "refactor" || /\b(large|wide|across)\b/.test(n)) {
    return { maxFiles: 12, maxLines: 800, maxNewFiles: 4, maxNewDependencies: 2 };
  }
  if (taskType === "feature") {
    return { maxFiles: 8, maxLines: 500, maxNewFiles: 3, maxNewDependencies: 2 };
  }
  return { maxFiles: 5, maxLines: 300, maxNewFiles: 2, maxNewDependencies: 1 };
}

export function buildScopeContract(input: {
  request: string;
  plan: ChangePlan;
  files: SourceFileInput[];
  patches?: Array<{ path: string }>;
}): ScopeContract {
  const taskType = inferTaskType(input.request);
  const budget = inferDiffBudget(taskType, input.request);
  const corpusPaths = new Set(input.files.map((f) => f.path));

  const planFiles = input.plan.impact.files.filter((p) => corpusPaths.has(p));
  const patchFiles = (input.patches ?? []).map((p) => p.path);
  const allowedSet = new Set(planFiles.length > 0 ? planFiles : patchFiles);

  const readOnly = input.files
    .map((f) => f.path)
    .filter((p) => !allowedSet.has(p) && !isTestPath(p))
    .filter((p) => isRelatedContext(p, allowedSet))
    .slice(0, 24);

  const requiresApprovalFor = SENSITIVE_ZONES.filter((zone) =>
    [...allowedSet].some((p) => p.toLowerCase().includes(zone))
  );

  const forbiddenPatterns = [...DEFAULT_FORBIDDEN];
  if (!requiresApprovalFor.includes("auth")) {
    forbiddenPatterns.push("**/routes/auth.*", "**/auth/**");
  }
  if (!requiresApprovalFor.includes("billing")) {
    forbiddenPatterns.push("**/billing/**", "**/payments/**");
  }
  if (!requiresApprovalFor.includes("migration")) {
    forbiddenPatterns.push("**/migrations/**", "**/sql/**");
  }

  const primary = planFiles[0] ?? patchFiles[0] ?? "core module";
  const testExpectations = inferTestExpectations(input.request, allowedSet, input.files);
  const apiImpact = inferApiImpact(planFiles, patchFiles);
  const affectedUserFlow = inferAffectedFlow(input.request, planFiles);

  const scopeLockMessage = !isWorkIntent(input.request)
    ? `Read-only Q&A — BootRise will not lock patch scope until you run Fix with a concrete change. ${allowedSet.size > 0 ? `If you later fix code, likely starting files: ${primary}.` : "Describe one narrow change to open the controlled Fix pipeline."}`
    : [
        `Task locked as ${taskType.replace("_", " ")}: "${input.plan.intent.interpretedGoal.slice(0, 120)}".`,
        `Likely flow: ${affectedUserFlow}.`,
        `Allowed to edit: ${allowedSet.size} file(s) starting with ${primary}.`,
        `Will not touch auth, billing, env, or migrations unless you approve scope expansion.`,
        `Diff budget: max ${budget.maxFiles} files, ${budget.maxLines} lines, ${budget.maxNewDependencies} new dependency.`
      ].join(" ");

  return {
    taskType,
    interpretedBehavior: input.plan.intent.interpretedGoal,
    affectedUserFlow,
    apiImpact,
    testExpectations,
    allowedEditFiles: Array.from(allowedSet).sort(),
    readOnlyFiles: readOnly,
    forbiddenPatterns,
    maxFilesChanged: budget.maxFiles,
    maxLinesChanged: budget.maxLines,
    maxNewFiles: budget.maxNewFiles,
    maxNewDependencies: budget.maxNewDependencies,
    requiresApprovalFor,
    scopeLockMessage,
    confidence: planFiles.length > 0 ? 0.82 : patchFiles.length > 0 ? 0.7 : 0.45
  };
}

function inferAffectedFlow(request: string, planFiles: string[]): string {
  const n = request.toLowerCase();
  if (/reward|redemption|offer/.test(n)) return "Rewards / offers user flow";
  if (/nav|map|route|turn/.test(n)) return "Navigation / map experience";
  if (/auth|login|sign/.test(n)) return "Authentication flow";
  if (planFiles[0]) return `Module around ${planFiles[0].split("/").slice(-2).join("/")}`;
  return "Core product workflow (clarify in request if narrower)";
}

function inferApiImpact(planFiles: string[], patchFiles: string[]): string {
  const paths = [...planFiles, ...patchFiles];
  const backend = paths.filter((p) => p.includes("backend") || p.includes("routes/") || p.includes("api/"));
  if (backend.length > 0) return `Backend/API paths: ${backend.slice(0, 3).join(", ")}`;
  return "Primarily UI — no backend routes in scope unless expanded.";
}

function inferTestExpectations(
  request: string,
  allowed: Set<string>,
  files: SourceFileInput[]
): string[] {
  const expectations: string[] = [];
  const n = request.toLowerCase();
  if (/\btest\b/.test(n) || allowed.size > 0) {
    const tests = files.map((f) => f.path).filter((p) => isTestPath(p) && [...allowed].some((a) => p.includes(a.split("/").slice(-1)[0] ?? "")));
    if (tests.length) expectations.push(`Run or update: ${tests.slice(0, 2).join(", ")}`);
  }
  expectations.push("Sandbox verify (typecheck/build) after approve");
  if (/api|backend|route/.test(n)) expectations.push("Smoke affected API route if backend touched");
  return expectations;
}

function isRelatedContext(path: string, allowed: Set<string>): boolean {
  const parts = path.split("/");
  if (parts.length < 2) return false;
  const prefix = parts.slice(0, 2).join("/");
  return [...allowed].some((a) => a.startsWith(prefix) || prefix.startsWith(a.split("/").slice(0, 2).join("/")));
}
