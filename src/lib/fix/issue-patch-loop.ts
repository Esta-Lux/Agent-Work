/**
 * SWE-agent / Aider-style issue → patch loop under BootRise control (supervised, not autonomous).
 */
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ChangePlan } from "@/lib/types/core";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import { buildScopeContract } from "@/lib/control/scope-contract";
import { runPatchGuard } from "@/lib/control/patch-guard";
import { generateRealPatches } from "@/lib/workspace/real-patches";
import type { LlmProviderId } from "@/lib/ai/providers";

export interface IssuePatchLoopResult {
  patches: ProposedPatch[];
  source: string;
  iterations: number;
  stopReason: string | null;
  gitDiscipline: string[];
  refined: boolean;
}

export function isFixLoopV2Enabled(): boolean {
  return process.env.BOOTRISE_FIX_LOOP_V2 === "1" || process.env.BOOTRISE_FIX_LOOP_V2 === "true";
}

const MAX_ITERATIONS = Number(process.env.BOOTRISE_FIX_LOOP_MAX_ITERATIONS ?? "3");

export async function runIssuePatchLoop(input: {
  provider: LlmProviderId;
  request: string;
  files: SourceFileInput[];
  plan: ChangePlan;
  orgId?: string;
  projectId?: string;
  repositoryId?: string;
}): Promise<IssuePatchLoopResult> {
  const gitDiscipline = [
    "Patches target existing paths only (Aider-style git-native discipline).",
    "No new dependencies without scope approval.",
    "Each iteration re-validates against scope contract and patch guard."
  ];

  let patches: ProposedPatch[] = [];
  let source = "none";
  let iterations = 0;
  let stopReason: string | null = null;
  let refined = false;
  let issueText = input.request;

  while (iterations < MAX_ITERATIONS) {
    iterations += 1;
    const generated = await generateRealPatches({
      provider: input.provider,
      request: issueText,
      files: input.files,
      plan: input.plan,
      orgId: input.orgId,
      projectId: input.projectId,
      repositoryId: input.repositoryId
    });
    patches = generated.patches;
    source = generated.source;

    if (patches.length === 0) {
      stopReason = "No patches produced for this iteration.";
      break;
    }

    const scopeContract = buildScopeContract({
      request: input.request,
      plan: input.plan,
      files: input.files,
      patches
    });
    const patchGuard = runPatchGuard({
      patches,
      contract: scopeContract,
      corpus: input.files,
      request: input.request
    });

    if (!patchGuard.blocked && patchGuard.passed) {
      stopReason = null;
      break;
    }

    refined = true;
    const finding = patchGuard.findings[0] ?? patchGuard.outOfScopeFiles[0] ?? "scope violation";
    stopReason = `Iteration ${iterations}: ${finding}`;
    issueText = `${input.request}\n\nRefine the patch: ${finding}. Stay within allowed files: ${scopeContract.allowedEditFiles.slice(0, 8).join(", ")}.`;
  }

  if (iterations >= MAX_ITERATIONS && patches.length > 0) {
    const lastGuard = runPatchGuard({
      patches,
      contract: buildScopeContract({
        request: input.request,
        plan: input.plan,
        files: input.files,
        patches
      }),
      corpus: input.files,
      request: input.request
    });
    if (lastGuard.blocked) {
      stopReason = stopReason ?? `Stopped after ${MAX_ITERATIONS} iterations — patch guard still blocked.`;
    }
  }

  return { patches, source, iterations, stopReason, gitDiscipline, refined };
}
