import type { ProductBrainContext } from "@/lib/product-brain/product-brain-types";
import type { WorkUnitPlan } from "@/lib/workspace/work-unit-planner";

export type ArchitectConversationClass =
  | "clear_to_build"
  | "needs_clarification"
  | "too_broad"
  | "high_risk"
  | "better_architecture_available"
  | "blocked_by_missing_context";

export interface ArchitectConversationResult {
  classification: ArchitectConversationClass;
  message: string;
  question?: string;
  recommendation?: string;
}

export function runArchitectConversationAgent(input: {
  task: string;
  workUnitPlan?: WorkUnitPlan | null;
  productContext?: ProductBrainContext;
}): ArchitectConversationResult {
  const task = input.task.trim();
  if (!task) {
    return {
      classification: "blocked_by_missing_context",
      message: "Describe the task in one scoped sentence before patching."
    };
  }

  const broad = /(and|also|then|across).*?(api|ui|auth|billing|database)/i.test(task) || task.length > 220;
  if (broad) {
    return {
      classification: "too_broad",
      message: "This request spans multiple concerns and should be split into smaller work units.",
      question: "Which user-facing outcome must ship first?",
      recommendation: "Start with one workflow slice and defer the rest."
    };
  }

  const highRisk = /auth|billing|payment|credit|security|policy|rls|tenant|admin/i.test(task)
    || input.workUnitPlan?.estimatedRiskLevel === "high"
    || (input.productContext?.knownRisks.length ?? 0) > 0;

  if (highRisk) {
    return {
      classification: "high_risk",
      message: "This task touches high-risk boundaries, so assumptions must be confirmed before patching.",
      question: "Should access and billing changes apply globally, per workspace, or per project owner?",
      recommendation: "Prefer least-privilege scope and keep tenant boundaries explicit."
    };
  }

  const architectureHint = /rewrite|replace|migrate|refactor everything|all files/i.test(task);
  if (architectureHint) {
    return {
      classification: "better_architecture_available",
      message: "A narrower architecture path is safer than a full rewrite.",
      recommendation: "Patch adapter layers first, then migrate internals incrementally."
    };
  }

  if (task.split(" ").length < 4) {
    return {
      classification: "needs_clarification",
      message: "The task intent is too short to execute safely.",
      question: "Which file or behavior should change, and what is the expected outcome?"
    };
  }

  return {
    classification: "clear_to_build",
    message: "Context is sufficient to proceed with scoped patching."
  };
}
