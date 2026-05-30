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
  /** Brain v2 repo graph one-liner for agent council graph_planner. */
  repoGraphSummary?: string;
}

export interface TaskIntentSummary {
  kind: string;
  depth: string;
  seniorArchitectMode: boolean;
  summary: string;
  suggestedMode: string;
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
  assumptionsApproved?: boolean;
  brainRulesCount?: number;
  brainFileHintsCount?: number;
  taskIntent?: TaskIntentSummary;
  architectBriefPreview?: string;
}

/** Serializable pack reused across chat, fix, and PR — proves what BootRise selected before spend. */
export interface TaskContextPack {
  taskKey: string;
  createdAt: string;
  request: string;
  orgId: string;
  projectId: string;
  repositoryId?: string;
  contextGate: ContextGateDecision;
  scopeContract: ScopeContract;
  contextPlan: ContextPlan;
  repositoryMap: RepositoryMap;
  tokenWaste: TokenWasteSummary;
  agentCoordination: AgentCoordinationSummary;
  brainSnapshot?: {
    rules: string[];
    fileHints: string[];
    moduleNames: string[];
  };
  canProceed: boolean;
  stopReason: string | null;
  assumptionsApproved: boolean;
  taskIntent?: TaskIntentSummary;
  architectBrief?: string;
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

export type AgentRole =
  | "lead_architect"
  | "builder"
  | "security"
  | "qa"
  | "runtime_monitor"
  | "deployment"
  | "reviewer"
  | "graph_planner";

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

export interface VagueOutputGuardSummary {
  passed: boolean;
  blocked: boolean;
  summary: string;
  findings: Array<{
    path?: string;
    phrase: string;
    message: string;
    severity: "warning" | "block";
  }>;
}

export interface TaskCompletionSummary {
  passed: boolean;
  blocked: boolean;
  summary: string;
  findings: Array<{
    severity: "warning" | "block";
    message: string;
  }>;
  coveredDomains: string[];
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
  vagueOutput: VagueOutputGuardSummary;
  taskCompletion: TaskCompletionSummary;
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
