import type { AgentCoordinationSummary } from "@/lib/control/types";
import { buildAgentCoordination } from "@/lib/control/agent-coordination";

/** Live workspace signals (security scan, chat review) before a Fix run produces controlLayer. */
export function buildWorkspaceAgentPreview(input: {
  securityBlockerCount: number;
  reviewFindingCount: number;
  graphSummary?: string;
  deployBlocked?: boolean;
}): AgentCoordinationSummary {
  const contextGate = {
    confidence: 0.7,
    status: "proceed_with_assumptions" as const,
    safetyMode: "observe" as const,
    reason: "Preview from Security Center and chat review — run Fix for patch-level coordination.",
    questions: [],
    assumptions: [],
    sensitiveAreas: []
  };
  const scopeContract = {
    taskType: "review" as const,
    interpretedBehavior: "Workspace intelligence preview",
    affectedUserFlow: "N/A",
    apiImpact: "None until Fix",
    testExpectations: [],
    allowedEditFiles: [],
    readOnlyFiles: [],
    forbiddenPatterns: [],
    maxFilesChanged: 0,
    maxLinesChanged: 0,
    maxNewFiles: 0,
    maxNewDependencies: 0,
    requiresApprovalFor: [],
    scopeLockMessage: "Import code and run Fix to lock an edit scope.",
    confidence: 0.7
  };
  const patchGuard = {
    passed: true,
    blocked: false,
    filesChanged: 0,
    linesChanged: 0,
    newFiles: 0,
    forbiddenTouched: [],
    outOfScopeFiles: [],
    findings: []
  };
  const regressionGuard = {
    passed: true,
    checks: [],
    summary: "Preview only — regression checks run after patch proposal.",
    suggestedCommands: [],
    executedCommands: []
  };
  const stopReason = input.deployBlocked ? "Deployment readiness is blocked — resolve Security Center blockers." : null;

  return buildAgentCoordination({
    contextGate,
    scopeContract,
    patchGuard,
    regressionGuard,
    stopReason,
    patchesCount: 0,
    graphSummary: input.graphSummary,
    securityBlockerCount: input.securityBlockerCount,
    reviewFindingCount: input.reviewFindingCount
  });
}
