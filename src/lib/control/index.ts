export type * from "@/lib/control/types";
export {
  runControlGate,
  assertApproveAllowed,
  clearControlTaskSession
} from "@/lib/control/control-gate";
export { runChatControlGate, selectChatContextFiles, buildChatRulesBlock } from "@/lib/control/chat-control";
export { buildTaskContextPack, formatContextPackSummary } from "@/lib/control/task-context-pack";
export { evaluateContextGate, userApprovedAssumptions, isWorkIntent } from "@/lib/control/context-gate";
export { buildTaskKey, recordPatchAttempt, getFailedAttemptCount, clearTaskSession } from "@/lib/control/task-session";
export { buildRepoSchemaIndex } from "@/lib/control/repo-schema-index";
export { buildInjectedContextRules } from "@/lib/control/context-rules";
export { buildScopeContract } from "@/lib/control/scope-contract";
export { buildContextPlan } from "@/lib/control/context-governor";
export { classifyTaskIntent } from "@/lib/ai/task-intent";
export {
  buildSeniorArchitectBrief,
  buildEfficientModelContext,
  getContextDepthBudget,
  BOOTRISE_SENIOR_ARCHITECT_CONTRACT
} from "@/lib/ai/senior-architect";
export { buildRepositoryMap } from "@/lib/control/repo-map";
export {
  buildTokenWasteSummary,
  evaluateTokenBudget,
  MAX_CONTEXT_CHARS
} from "@/lib/control/token-waste-guard";
export {
  assertCanGeneratePatch,
  assertCanApprove,
  assertCanApply
} from "@/lib/control/control-enforcement";
export { runRegressionGuard } from "@/lib/control/regression-guard";
export { evaluateStopPolicy } from "@/lib/control/stop-policy";
export { runPatchGuard } from "@/lib/control/patch-guard";
export { runHallucinationGuard } from "@/lib/control/hallucination-guard";
export { runNoopGuard } from "@/lib/control/noop-guard";
export { buildControlTelemetrySnapshot, recordControlEvent, loadControlEvents } from "@/lib/control/control-telemetry";
