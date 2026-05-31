import { existsSync, readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { getAdminBuildMission } from "@/lib/admin-build/admin-build-store";
import type { SelfAgentWorkUnit } from "@/lib/agents/admin/self-agent-architect";
import { generateSelfAgentPatch, isReviewOnlyMission } from "@/lib/agents/admin/self-agent-patch-generator";
import { runCoderAgent } from "@/lib/admin/agents/coder";
import { loadCodebaseMemory } from "@/lib/admin/codebase-memory";
import { isProviderConfigured } from "@/lib/ai/llm-router";
import { resolveAdminProvider } from "@/lib/ai/providers";
import type { LlmProviderId } from "@/lib/ai/providers";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { buildRepoIntelligenceSnapshot } from "@/lib/intelligence/repo-intelligence";
import { createInitialChangePlan } from "@/lib/planning/planner";
import { DEFAULT_ORG_ID } from "@/lib/tenancy/org-context";
import type { AuthUser } from "@/lib/auth/types";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export interface SelfAgentPatchPreview {
  missionId: string;
  workUnits: SelfAgentWorkUnit[];
  patches: ProposedPatch[];
  warnings: string[];
  source: "llm" | "fallback";
}

/** Resolve a relative path and ensure it stays inside the project root. */
function safeResolve(relativePath: string): string | null {
  const root = process.cwd();
  const absolute = resolve(root, relativePath);
  // Reject any path that escapes the project root (directory traversal guard)
  if (relative(root, absolute).startsWith("..")) return null;
  return absolute;
}

function loadWorkUnitFiles(workUnits: SelfAgentWorkUnit[]): SourceFileInput[] {
  const seen = new Set<string>();
  const files: SourceFileInput[] = [];
  for (const unit of workUnits) {
    for (const path of [...unit.targetFiles, ...unit.readOnlyFiles]) {
      if (seen.has(path)) continue;
      seen.add(path);
      const absolute = safeResolve(path);
      if (!absolute || !existsSync(absolute)) continue;
      files.push({ path, content: readFileSync(absolute, "utf8") });
    }
  }
  return files;
}

async function runLlmPatches(input: {
  missionId: string;
  missionTitle: string;
  missionObjective: string;
  workUnits: SelfAgentWorkUnit[];
  user: AuthUser;
  orgId: string;
  provider: LlmProviderId;
}): Promise<{ patches: ProposedPatch[]; warnings: string[] }> {
  const files = loadWorkUnitFiles(input.workUnits);
  if (files.length === 0) {
    return { patches: [], warnings: ["No target files found in local workspace for LLM patch generation."] };
  }

  const repo = buildRepoIntelligenceSnapshot(files);
  const targetPaths = [...new Set(input.workUnits.flatMap((u) => u.targetFiles))];
  const scaffold = createInitialChangePlan(input.missionObjective, repo);
  const plan = {
    ...scaffold,
    intent: {
      ...scaffold.intent,
      request: input.missionObjective,
      interpretedGoal: `Self-agent mission: ${input.missionTitle} — ${input.missionObjective.slice(0, 120)}`
    },
    impact: { ...scaffold.impact, files: targetPaths.length > 0 ? targetPaths : scaffold.impact.files }
  };

  const memory = await loadCodebaseMemory();

  const result = await runCoderAgent({
    user: input.user,
    orgId: input.orgId,
    plan,
    files,
    provider: input.provider,
    memory,
    request: input.missionObjective,
    projectId: "admin-self",
    repositoryId: "admin-self"
  });

  const targetSet = new Set(targetPaths);
  const scopedPatches = result.patches.filter((p) => targetSet.size === 0 || targetSet.has(p.path));

  return { patches: scopedPatches, warnings: [] };
}

function runMarkerPatches(
  workUnits: SelfAgentWorkUnit[],
  missionTitle: string,
  missionObjective: string
): { patches: ProposedPatch[]; warnings: string[] } {
  const patches: ProposedPatch[] = [];
  const warnings: string[] = [];
  for (const unit of workUnits) {
    for (const path of unit.targetFiles.slice(0, 6)) {
      const absolute = safeResolve(path);
      if (!absolute || !existsSync(absolute)) {
        warnings.push(`Skipped ${path}: file not found in local workspace.`);
        continue;
      }
      const before = readFileSync(absolute, "utf8");
      const patch = generateSelfAgentPatch({ missionTitle, missionObjective, workUnit: unit, path, before });
      if (patch.after !== patch.before) patches.push(patch);
    }
  }
  return { patches, warnings };
}

export async function runSelfAgentBuilder(input: {
  missionId: string;
  workUnits: SelfAgentWorkUnit[];
  user?: AuthUser;
  orgId?: string;
  provider?: string;
}): Promise<SelfAgentPatchPreview> {
  const mission = getAdminBuildMission(input.missionId);
  if (!mission) {
    throw new Error("Mission not found.");
  }

  const reviewOnly = isReviewOnlyMission(mission.objective);
  if (reviewOnly) {
    return {
      missionId: mission.id,
      workUnits: input.workUnits,
      patches: [],
      warnings: ["Review-only mission produced no code changes by design."],
      source: "fallback"
    };
  }

  const provider = resolveAdminProvider(input.provider);
  const llmAvailable = isProviderConfigured(provider) && input.user;

  if (llmAvailable && input.user) {
    try {
      const { patches, warnings } = await runLlmPatches({
        missionId: mission.id,
        missionTitle: mission.title,
        missionObjective: mission.objective,
        workUnits: input.workUnits,
        user: input.user,
        orgId: input.orgId ?? DEFAULT_ORG_ID,
        provider
      });
      if (patches.length > 0) {
        return { missionId: mission.id, workUnits: input.workUnits, patches, warnings, source: "llm" };
      }
      // LLM returned no patches — fall through to marker fallback with a warning
      warnings.push("LLM code generation returned no patches; falling back to structural preview.");
      const fallback = runMarkerPatches(input.workUnits, mission.title, mission.objective);
      return {
        missionId: mission.id,
        workUnits: input.workUnits,
        patches: fallback.patches,
        warnings: [...warnings, ...fallback.warnings],
        source: "fallback"
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const fallback = runMarkerPatches(input.workUnits, mission.title, mission.objective);
      return {
        missionId: mission.id,
        workUnits: input.workUnits,
        patches: fallback.patches,
        warnings: [`LLM patch generation failed (${errMsg}); using structural preview.`, ...fallback.warnings],
        source: "fallback"
      };
    }
  }

  // Offline / no-user mode: use structural marker preview
  const { patches, warnings } = runMarkerPatches(input.workUnits, mission.title, mission.objective);
  if (patches.length === 0) {
    throw new Error("Self-agent patch preview produced no code changes. No-op previews are invalid for this mission.");
  }
  return { missionId: mission.id, workUnits: input.workUnits, patches, warnings, source: "fallback" };
}
