import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ContextGateDecision, SafetyMode } from "@/lib/control/types";

const WORK_INTENT = /\b(add|build|create|implement|change|fix|refactor|remove|delete|migrate|integrate|ship|deploy|wire|connect)\b/i;
const ASSUMPTIONS_APPROVED =
  /\b(proceed anyway|approve assumptions|use assumptions|skip questions|continue anyway|go ahead with assumptions|proceed with assumptions)\b/i;
const HIGH_RISK = [
  { id: "auth", pattern: /\b(auth|login|signup|session|role|permission|sso|oauth|jwt)\b/i },
  { id: "billing", pattern: /\b(stripe|billing|payment|subscription|invoice|checkout|webhook)\b/i },
  { id: "database", pattern: /\b(database|schema|migration|rls|table|supabase|postgres|sql)\b/i },
  { id: "deployment", pattern: /\b(deploy|production|vercel|fly|render|domain|env)\b/i },
  { id: "data ownership", pattern: /\b(org|organization|tenant|team|admin|owner|member)\b/i }
];

export function isWorkIntent(request: string): boolean {
  return WORK_INTENT.test(request);
}

export function userApprovedAssumptions(request: string): boolean {
  return ASSUMPTIONS_APPROVED.test(request);
}

export function evaluateContextGate(input: {
  request: string;
  files: SourceFileInput[];
  targetFiles?: string[];
  assumptionsApproved?: boolean;
}): ContextGateDecision {
  const request = input.request.trim();
  const lower = request.toLowerCase();
  const sensitiveAreas = HIGH_RISK.filter((risk) => risk.pattern.test(request)).map((risk) => risk.id);
  const mentionsSpecificTarget = /[\w-]+\.(tsx?|jsx?|py|sql|md|json|css)|\/|screen|route|api|component|hook|table|model/.test(lower);
  const hasRepoContext = input.files.length > 0;
  const hasTargetFiles = (input.targetFiles ?? []).length > 0;
  const isWork = isWorkIntent(request);
  const assumptionsApproved = Boolean(input.assumptionsApproved) || userApprovedAssumptions(request);

  let confidence = 0.44;
  if (request.length >= 35) confidence += 0.12;
  if (request.length >= 90) confidence += 0.1;
  if (mentionsSpecificTarget) confidence += 0.16;
  if (hasRepoContext) confidence += 0.12;
  if (hasTargetFiles) confidence += 0.18;
  if (sensitiveAreas.length > 0) confidence -= 0.16;
  if (!isWork) confidence += 0.14;
  if (assumptionsApproved) confidence += 0.08;
  confidence = Math.max(0.12, Math.min(0.94, Number(confidence.toFixed(2))));

  let status: ContextGateDecision["status"] =
    !isWork || confidence >= 0.72
      ? "proceed_with_assumptions"
      : confidence >= 0.48
        ? "needs_clarification"
        : "blocked";

  if (assumptionsApproved && status === "needs_clarification") {
    status = "proceed_with_assumptions";
  }

  const safetyMode: SafetyMode =
    status === "blocked"
      ? "observe"
      : status === "needs_clarification"
        ? "suggest_patches"
        : sensitiveAreas.length > 0
          ? "suggest_patches"
          : "auto_fix_safe";

  return {
    confidence,
    status,
    safetyMode,
    reason: buildReason({
      isWork,
      hasRepoContext,
      hasTargetFiles,
      mentionsSpecificTarget,
      sensitiveAreas,
      status,
      assumptionsApproved
    }),
    questions: status === "proceed_with_assumptions" ? [] : buildQuestions(lower, sensitiveAreas),
    assumptions: buildAssumptions(lower, sensitiveAreas, hasRepoContext, assumptionsApproved),
    sensitiveAreas
  };
}

function buildReason(input: {
  isWork: boolean;
  hasRepoContext: boolean;
  hasTargetFiles: boolean;
  mentionsSpecificTarget: boolean;
  sensitiveAreas: string[];
  status: ContextGateDecision["status"];
  assumptionsApproved: boolean;
}): string {
  if (!input.isWork) return "This is a review or explanation request, so BootRise can answer without locking edit scope.";
  if (input.assumptionsApproved && input.status === "proceed_with_assumptions") {
    return "Proceeding with user-approved assumptions — scope lock and patch guards still apply.";
  }
  if (input.status === "blocked") return "The request is too broad to patch safely without narrowing the target and ownership rules.";
  if (input.status === "needs_clarification") {
    return "BootRise needs a few product and data-shape answers before it can authorize code edits.";
  }
  if (input.sensitiveAreas.length > 0) return `Proceeding with caution because this touches ${input.sensitiveAreas.join(", ")}.`;
  if (!input.hasRepoContext) return "Proceeding with assumptions, but real repo context is still needed before patching.";
  if (input.hasTargetFiles && !input.mentionsSpecificTarget) return "Proceeding because the planning layer identified target files from repository context.";
  if (!input.mentionsSpecificTarget) return "Proceeding with assumptions; target files will be inferred from repository context.";
  return "Enough task and repository context exists to draft a scoped plan.";
}

function buildQuestions(lower: string, sensitiveAreas: string[]): ContextGateDecision["questions"] {
  const questions: ContextGateDecision["questions"] = [
    {
      id: "target_surface",
      question: "Which screen, route, component, or backend module should BootRise treat as the primary target?",
      whyItMatters: "The file-touch contract needs a narrow owner before the Builder Agent can patch."
    },
    {
      id: "success_state",
      question: "What exact user-visible behavior should change when this is done?",
      whyItMatters: "QA needs a concrete acceptance check instead of guessing from the prompt."
    }
  ];

  if (/reward|redemption|offer/.test(lower)) {
    questions.push({
      id: "reward_states",
      question: "Should this include all reward activity, or only completed redemptions?",
      whyItMatters: "Pending, failed, and redeemed states usually require different API and UI handling."
    });
  }

  if (sensitiveAreas.includes("database")) {
    questions.push({
      id: "data_source",
      question: "Should this use existing data, or are you approving a new table/API/migration?",
      whyItMatters: "Database shape changes require an explicit approval gate and rollback plan."
    });
  }

  if (sensitiveAreas.includes("billing")) {
    questions.push({
      id: "billing_policy",
      question: "What should happen on payment failure, downgrade, or canceled subscription?",
      whyItMatters: "Billing changes can create account-access and security bugs if the policy is unclear."
    });
  }

  if (sensitiveAreas.includes("auth") || sensitiveAreas.includes("data ownership")) {
    questions.push({
      id: "ownership",
      question: "Which roles or organizations are allowed to see and change this data?",
      whyItMatters: "Security Agent blocks patches that trust client-provided identity or ownership."
    });
  }

  return questions.slice(0, 5);
}

function buildAssumptions(
  lower: string,
  sensitiveAreas: string[],
  hasRepoContext: boolean,
  assumptionsApproved: boolean
): string[] {
  const assumptions = [
    hasRepoContext ? "Use the imported repository as the source of truth." : "Do not generate code until repository context is loaded.",
    "Keep changes behind review and approval before applying patches.",
    "Prefer small, testable diffs over wide rewrites."
  ];
  if (assumptionsApproved) {
    assumptions.push("User approved proceeding with stated assumptions — diff budget and patch guards remain enforced.");
  }
  if (/chat|message/.test(lower)) {
    assumptions.push("Consider status-based updates before full free-form messaging if moderation or safety is a concern.");
  }
  if (sensitiveAreas.length > 0) {
    assumptions.push("Sensitive areas require Security Agent review and cannot auto-apply.");
  }
  return assumptions;
}
