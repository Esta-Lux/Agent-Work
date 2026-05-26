import type {
  AgentCoordinationSummary,
  AgentDecision,
  ContextGateDecision,
  ControlLayerSummary,
  PatchGuardResult,
  ScopeContract
} from "@/lib/control/types";
import type { RegressionGuardResult } from "@/lib/control/regression-guard";

export function buildAgentCoordination(input: {
  contextGate: ContextGateDecision;
  scopeContract: ScopeContract;
  patchGuard: PatchGuardResult;
  regressionGuard: RegressionGuardResult;
  stopReason: string | null;
  patchesCount: number;
}): AgentCoordinationSummary {
  const decisions: AgentDecision[] = [
    leadArchitectDecision(input.contextGate, input.scopeContract),
    builderDecision(input.scopeContract, input.patchGuard, input.patchesCount),
    securityDecision(input.contextGate, input.scopeContract, input.patchGuard),
    qaDecision(input.regressionGuard),
    runtimeDecision(input.regressionGuard),
    deploymentDecision(input.stopReason, input.patchGuard, input.regressionGuard)
  ];
  const blockers = decisions.filter((d) => d.blocksPatch).map((d) => d.finding);
  const userApprovalRequired = [
    ...input.scopeContract.requiresApprovalFor.map((area) => `${area} scope expansion`),
    ...(input.contextGate.status !== "proceed_with_assumptions" ? ["context answers"] : []),
    ...(input.patchGuard.filesChanged > 0 ? ["patch application"] : [])
  ];

  const canPatch = input.contextGate.status === "proceed_with_assumptions" && !input.stopReason;
  const canApply =
    canPatch &&
    blockers.length === 0 &&
    !input.patchGuard.blocked &&
    input.regressionGuard.passed &&
    input.patchesCount > 0;

  return {
    leadSummary: buildLeadSummary(input.contextGate, input.scopeContract, blockers),
    mode: input.contextGate.safetyMode,
    canPatch,
    canApply,
    safeToPr: canApply,
    safeToDeploy: canApply && input.contextGate.sensitiveAreas.length === 0,
    userApprovalRequired: Array.from(new Set(userApprovalRequired)),
    blockers,
    decisions
  };
}

export function getBlockingAgentFindings(control: ControlLayerSummary): AgentDecision[] {
  return control.agentCoordination.decisions.filter((decision) => decision.blocksPatch);
}

function leadArchitectDecision(contextGate: ContextGateDecision, scopeContract: ScopeContract): AgentDecision {
  return {
    agent: "lead_architect",
    severity: contextGate.status === "blocked" ? "block" : contextGate.status === "needs_clarification" ? "warning" : "info",
    blocksPatch: contextGate.status !== "proceed_with_assumptions",
    finding: `Context confidence ${Math.round(contextGate.confidence * 100)}% — ${contextGate.reason}`,
    recommendedFix:
      contextGate.status === "proceed_with_assumptions"
        ? scopeContract.scopeLockMessage
        : `Answer: ${contextGate.questions.map((q) => q.question).join(" ")}`
  };
}

function builderDecision(
  scopeContract: ScopeContract,
  patchGuard: PatchGuardResult,
  patchesCount: number
): AgentDecision {
  const overBudget = patchGuard.filesChanged > scopeContract.maxFilesChanged || patchGuard.linesChanged > scopeContract.maxLinesChanged;
  return {
    agent: "builder",
    severity: overBudget || patchesCount === 0 ? "warning" : "info",
    blocksPatch: overBudget,
    finding:
      patchesCount === 0
        ? "No patch was produced yet; Builder Agent needs a narrower target or configured engine."
        : `Builder Agent stayed within ${patchGuard.filesChanged}/${scopeContract.maxFilesChanged} files and ${patchGuard.linesChanged}/${scopeContract.maxLinesChanged} lines.`,
    recommendedFix: overBudget
      ? "Split this into a smaller scope contract before patching."
      : "Edit only files listed in the file-touch contract."
  };
}

function securityDecision(
  contextGate: ContextGateDecision,
  scopeContract: ScopeContract,
  patchGuard: PatchGuardResult
): AgentDecision {
  const forbidden = patchGuard.forbiddenTouched.length > 0;
  const riskyOutOfScope = patchGuard.outOfScopeFiles.filter((path) =>
    /auth|billing|payment|stripe|secret|env|migration|sql/i.test(path)
  );
  const sensitive = contextGate.sensitiveAreas.length > 0 || scopeContract.requiresApprovalFor.length > 0;
  return {
    agent: "security",
    severity: forbidden || riskyOutOfScope.length > 0 ? "block" : sensitive ? "warning" : "info",
    blocksPatch: forbidden || riskyOutOfScope.length > 0,
    finding: forbidden
      ? `Forbidden files touched: ${patchGuard.forbiddenTouched.join(", ")}.`
      : riskyOutOfScope.length > 0
        ? `Sensitive out-of-scope files touched: ${riskyOutOfScope.join(", ")}.`
      : sensitive
        ? `Sensitive scope detected: ${Array.from(new Set([...contextGate.sensitiveAreas, ...scopeContract.requiresApprovalFor])).join(", ")}.`
        : "No sensitive auth, billing, env, or migration touch detected.",
    recommendedFix: forbidden
      ? "Remove forbidden edits or ask the user to explicitly expand scope."
      : "Resolve identity, ownership, and secrets server-side before approval."
  };
}

function qaDecision(regressionGuard: RegressionGuardResult): AgentDecision {
  const failed = regressionGuard.checks.find((check) => check.status === "failed");
  return {
    agent: "qa",
    severity: failed ? "block" : "info",
    blocksPatch: Boolean(failed),
    finding: failed ? `${failed.label}: ${failed.detail}` : regressionGuard.summary,
    recommendedFix: failed ? "Fix the failed check, then rerun verification." : "Run sandbox verify after approval for build proof."
  };
}

function runtimeDecision(regressionGuard: RegressionGuardResult): AgentDecision {
  const needsRuntime = regressionGuard.suggestedCommands.length > 0 || regressionGuard.executedCommands.length === 0;
  return {
    agent: "runtime_monitor",
    severity: needsRuntime ? "warning" : "info",
    blocksPatch: false,
    finding: needsRuntime
      ? "Runtime Monitor needs dev preview, browser console, or smoke-test evidence after approval."
      : "Runtime Monitor has command evidence to attach to the Living Ledger.",
    recommendedFix: "Use Verify to run sandbox checks and capture preview errors before PR."
  };
}

function deploymentDecision(
  stopReason: string | null,
  patchGuard: PatchGuardResult,
  regressionGuard: RegressionGuardResult
): AgentDecision {
  const blocked = Boolean(stopReason) || patchGuard.blocked || !regressionGuard.passed;
  return {
    agent: "deployment",
    severity: blocked ? "block" : "info",
    blocksPatch: blocked,
    finding: blocked ? stopReason ?? "Patch is not safe for PR/deploy yet." : "Safe to prepare draft PR after approval and sandbox proof.",
    recommendedFix: blocked
      ? "Clear control, security, and QA blockers before push."
      : "Create a draft PR first; deploy only after environment and rollback checks pass."
  };
}

function buildLeadSummary(contextGate: ContextGateDecision, scopeContract: ScopeContract, blockers: string[]): string {
  if (blockers.length > 0) {
    return `Lead Architect is holding the task at ${Math.round(contextGate.confidence * 100)}% confidence: ${blockers[0]}`;
  }
  return `Lead Architect locked scope at ${Math.round(contextGate.confidence * 100)}% confidence. ${scopeContract.scopeLockMessage}`;
}
