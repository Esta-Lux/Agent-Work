import type { RegressionGuardResult } from "@/lib/control/regression-guard";
import type { RepositoryMap } from "@/lib/control/repo-map";
import type { TokenWasteSummary } from "@/lib/control/token-waste-guard";

export type ControlTaskType = "bug_fix" | "feature" | "refactor" | "review";

export type ControlSeverity = "info" | "warning" | "block";

export interface ScopeContract {
  taskType: ControlTaskType;
  interpretedBehavior: string;
  affectedUserFlow: string;
  apiImpact: string;
  testExpectations: string[];
  allowedEditFiles: string[];
  readOnlyFiles: string[];
  forbiddenPatterns: string[];
  maxFilesChanged: number;
  maxLinesChanged: number;
  maxNewFiles: number;
  maxNewDependencies: number;
  requiresApprovalFor: string[];
  scopeLockMessage: string;
  confidence: number;
}

export interface ContextFileEntry {
  path: string;
  mode: "deep_read" | "reference" | "excluded";
  reason: string;
}

export interface ContextPlan {
  totalFilesInCorpus: number;
  deepRead: ContextFileEntry[];
  reference: ContextFileEntry[];
  excluded: ContextFileEntry[];
  injectedRules: string[];
  estimatedChars: number;
  estimatedTokens: number;
  confidence: number;
  summary: string;
}

export interface ChatControlSummary {
  contextGate: ContextGateDecision;
  contextPlan: ContextPlan;
  repositoryMap: RepositoryMap;
  tokenWaste: TokenWasteSummary;
  canProceed: boolean;
  stopReason: string | null;
  failedPatchAttempts: number;
  scopePreview: string;
}

export type ContextGateStatus = "proceed_with_assumptions" | "needs_clarification" | "blocked";
export type SafetyMode = "observe" | "suggest_patches" | "auto_fix_safe" | "autonomous_blocked";

export interface ContextGateDecision {
  confidence: number;
  status: ContextGateStatus;
  safetyMode: SafetyMode;
  reason: string;
  questions: Array<{
    id: string;
    question: string;
    whyItMatters: string;
  }>;
  assumptions: string[];
  sensitiveAreas: string[];
}

export type AgentRole = "lead_architect" | "builder" | "security" | "qa" | "runtime_monitor" | "deployment";

export interface AgentDecision {
  agent: AgentRole;
  finding: string;
  severity: ControlSeverity;
  blocksPatch: boolean;
  recommendedFix: string;
}

export interface AgentCoordinationSummary {
  leadSummary: string;
  mode: SafetyMode;
  canPatch: boolean;
  canApply: boolean;
  safeToPr: boolean;
  safeToDeploy: boolean;
  userApprovalRequired: string[];
  blockers: string[];
  decisions: AgentDecision[];
}

export interface ControlFinding {
  id: string;
  severity: ControlSeverity;
  category: "scope" | "hallucination" | "diff_budget" | "noop" | "forbidden" | "token";
  message: string;
  path?: string;
}

export interface PatchGuardResult {
  passed: boolean;
  blocked: boolean;
  filesChanged: number;
  linesChanged: number;
  newFiles: number;
  forbiddenTouched: string[];
  outOfScopeFiles: string[];
  findings: ControlFinding[];
}

export interface ControlLayerSummary {
  contextGate: ContextGateDecision;
  agentCoordination: AgentCoordinationSummary;
  scopeContract: ScopeContract;
  contextPlan: ContextPlan;
  patchGuard: PatchGuardResult;
  regressionGuard: RegressionGuardResult;
  repositoryMap: RepositoryMap;
  tokenWaste: TokenWasteSummary;
  stopReason: string | null;
  failedPatchAttempts: number;
  canApprove: boolean;
  canApply: boolean;
  tokenEstimate: {
    contextChars: number;
    patchChars: number;
    estimatedUsd: number;
  };
}

export interface ControlTelemetrySnapshot {
  generatedAt: string;
  blocksLast24h: number;
  approvalsLast24h: number;
  rejectionsLast24h: number;
  patchBlocksLast24h: number;
  avgFilesDeepRead: number;
  avgTokenEstimate: number;
  recentEvents: Array<{
    action: string;
    detail: string;
    severity?: string;
    createdAt: string;
  }>;
}
