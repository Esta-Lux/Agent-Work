import type { AdminBuildMission } from "@/lib/admin-build/types";
import { evaluateVagueOutputGuard } from "@/lib/control/vague-output-guard";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export interface SelfAgentMission {
  id: string;
  title: string;
  description: string;
  targetBranch: string;
  createdAt: string;
  createdBy: string;
}

export interface SelfAgentScope {
  missionId: string;
  workUnits: SelfAgentWorkUnit[];
  totalFilesAffected: number;
  estimatedRiskLevel: "low" | "medium" | "high";
  requiresAdminApproval: true;
  scopeSummary: string;
  safetyNote: string;
}

export interface SelfAgentWorkUnit {
  id: string;
  label: string;
  domain: "backend" | "frontend" | "data" | "security" | "tests" | "docs";
  targetFiles: string[];
  readOnlyFiles: string[];
  description: string;
  riskLevel: "low" | "medium" | "high";
}

export interface SelfAgentRepoFile {
  path: string;
  content: string;
}

const FALLBACK_TARGETS = [
  "src/components/admin/self-agent-page.tsx",
  "src/app/api/admin/self-agent/plan/route.ts",
  "src/lib/agents/admin/self-agent-architect.ts"
];

const DEFAULT_READ_ONLY = [
  "src/lib/auth/admin-auth.ts",
  "src/lib/auth/with-admin-auth.ts",
  "src/lib/agents/admin/self-agent-boundary.ts"
];

export function isProtectedSelfAgentBranch(branchName: string): boolean {
  return /main|master/i.test(branchName.trim());
}

export function buildSelfAgentMission(input: {
  mission: AdminBuildMission;
  targetBranch: string;
}): SelfAgentMission {
  return {
    id: input.mission.id,
    title: input.mission.title,
    description: input.mission.objective,
    targetBranch: input.targetBranch,
    createdAt: input.mission.createdAt,
    createdBy: input.mission.createdBy
  };
}

export function createSelfAgentScopePreview(input: {
  missionId: string;
  title: string;
  description: string;
  repoFiles: SelfAgentRepoFile[];
}): SelfAgentScope {
  const description = input.description.trim();
  const candidates = chooseTargetFiles(description, input.repoFiles);
  const units = groupTargetFiles(input.missionId, description, candidates, input.repoFiles);
  const affected = new Set(units.flatMap((unit) => unit.targetFiles));
  const risk = estimateScopeRisk(units);
  const scopeSummary = `Scope for "${input.title.trim()}" is split into ${units.length} admin-owned work unit${units.length === 1 ? "" : "s"} across ${affected.size} file${affected.size === 1 ? "" : "s"}.`;

  const guard = evaluateVagueOutputGuard([
    {
      path: "self-agent-scope",
      before: "",
      after: [
        scopeSummary,
        ...units.flatMap((unit) => [unit.description, ...unit.targetFiles, ...unit.readOnlyFiles])
      ].join("\n"),
      summary: scopeSummary
    } satisfies ProposedPatch
  ]);

  if (guard.blocked) {
    const first = guard.findings[0];
    throw new Error(first?.message ?? "Self-Agent scope is too vague to approve.");
  }

  return {
    missionId: input.missionId,
    workUnits: units,
    totalFilesAffected: affected.size,
    estimatedRiskLevel: risk,
    requiresAdminApproval: true,
    scopeSummary,
    safetyNote: "This scope preview does not generate patches, push branches, or mutate main. Admin approval is required before any later self-agent execution."
  };
}

function chooseTargetFiles(description: string, repoFiles: SelfAgentRepoFile[]): string[] {
  const lower = description.toLowerCase();
  const paths = repoFiles.map((file) => file.path);
  const selected = new Set<string>();

  for (const path of paths) {
    const normalized = path.toLowerCase();
    if (lower.includes("self-agent") && normalized.includes("self-agent")) selected.add(path);
    if (lower.includes("admin") && normalized.includes("/admin")) selected.add(path);
    if ((lower.includes("workspace") || lower.includes("user")) && normalized.includes("/workspace")) selected.add(path);
    if ((lower.includes("api") || lower.includes("route")) && normalized.includes("/api/")) selected.add(path);
    if ((lower.includes("security") || lower.includes("auth")) && /auth|security|boundary|guard/.test(normalized)) selected.add(path);
    if ((lower.includes("data") || lower.includes("supabase")) && /supabase|data|store|schema/.test(normalized)) selected.add(path);
    if ((lower.includes("test") || lower.includes("verify")) && /\.test\.|\/test/.test(normalized)) selected.add(path);
  }

  for (const fallback of FALLBACK_TARGETS) {
    if (paths.includes(fallback)) selected.add(fallback);
  }

  return [...selected].slice(0, 12);
}

function groupTargetFiles(
  missionId: string,
  description: string,
  targetFiles: string[],
  repoFiles: SelfAgentRepoFile[]
): SelfAgentWorkUnit[] {
  const files = targetFiles.length > 0 ? targetFiles : FALLBACK_TARGETS;
  const byDomain = new Map<SelfAgentWorkUnit["domain"], string[]>();

  for (const path of files) {
    const domain = inferDomain(path);
    byDomain.set(domain, [...(byDomain.get(domain) ?? []), path]);
  }

  return [...byDomain.entries()].map(([domain, paths], index) => ({
    id: `${missionId}_wu_${index + 1}`,
    label: `${domainLabel(domain)} scope`,
    domain,
    targetFiles: paths,
    readOnlyFiles: chooseReadOnlyFiles(domain, repoFiles, paths),
    description: `Evaluate and prepare scoped changes for ${paths.join(", ")} so the mission can be reviewed before patch generation.`,
    riskLevel: estimateUnitRisk(domain, paths, description)
  }));
}

function chooseReadOnlyFiles(
  domain: SelfAgentWorkUnit["domain"],
  repoFiles: SelfAgentRepoFile[],
  targetFiles: string[]
): string[] {
  const target = new Set(targetFiles);
  const paths = repoFiles.map((file) => file.path);
  const readOnly = new Set(DEFAULT_READ_ONLY.filter((path) => paths.includes(path) && !target.has(path)));

  for (const path of paths) {
    const lower = path.toLowerCase();
    if (target.has(path)) continue;
    if (domain === "frontend" && /tailwind|layout|globals|components\/ui/.test(lower)) readOnly.add(path);
    if (domain === "backend" && /lib\/auth|lib\/control|workspace-types|types\.ts/.test(lower)) readOnly.add(path);
    if (domain === "data" && /schema|supabase|migration|store/.test(lower)) readOnly.add(path);
    if (domain === "security" && /auth|middleware|boundary|guard|security/.test(lower)) readOnly.add(path);
    if (domain === "tests" && /package\.json|tsconfig|vitest|jest|playwright/.test(lower)) readOnly.add(path);
  }

  return [...readOnly].slice(0, 8);
}

function inferDomain(path: string): SelfAgentWorkUnit["domain"] {
  const lower = path.toLowerCase();
  if (/api\/|lib\/agents|lib\/control|server|route\.ts/.test(lower)) return "backend";
  if (/component|app\/.*page|tailwind|css/.test(lower)) return "frontend";
  if (/supabase|schema|migration|store|data/.test(lower)) return "data";
  if (/auth|security|boundary|guard|middleware/.test(lower)) return "security";
  if (/\.test\.|\/test|spec/.test(lower)) return "tests";
  if (/readme|docs|md$/.test(lower)) return "docs";
  return "backend";
}

function domainLabel(domain: SelfAgentWorkUnit["domain"]): string {
  return domain.replace("_", " ");
}

function estimateUnitRisk(
  domain: SelfAgentWorkUnit["domain"],
  paths: string[],
  description: string
): "low" | "medium" | "high" {
  if (domain === "security" || paths.some((path) => /auth|middleware|supabase|migration/i.test(path))) return "high";
  if (/api|route|provider|billing|kill switch|approval/i.test(description) || domain === "backend" || domain === "data") return "medium";
  return "low";
}

function estimateScopeRisk(units: SelfAgentWorkUnit[]): "low" | "medium" | "high" {
  if (units.some((unit) => unit.riskLevel === "high")) return "high";
  if (units.some((unit) => unit.riskLevel === "medium") || units.length > 2) return "medium";
  return "low";
}
