import type { ChangePlan, DiffPreview } from "@/lib/types/core";
import type { RepoHealthSummary } from "@/lib/reporting/repo-health";
import type { SafeToPrVerdict } from "@/lib/workspace/safe-to-pr";
import type { createVerificationSummary } from "@/lib/verification/verification-summary";
import type { ChatControlSummary, ControlLayerSummary } from "@/lib/control/types";
import type { ReviewFinding } from "@/lib/workspace/review-findings";

export type { RepoHealthSummary, SafeToPrVerdict };

export interface ProjectBrief {
  productName: string;
  audience: string;
  primaryWorkflow: string;
  authRequired: boolean;
  paymentsRequired: boolean;
  deploymentTarget: string;
  constraints: string[];
  longBuild: boolean;
}

export interface ArchitectureRoadmap {
  appType: string;
  currentMaturity: "prototype" | "controlled_alpha" | "closed_beta" | "release_candidate" | "production_ready";
  productionReadiness: "blocked" | "needs_review" | "safe_for_staging" | "production_candidate" | "production_ready";
  currentStateSummary: string;
  missingCapabilities: string[];
  securityPolicies: string[];
  recommendedIntegrations: string[];
  deploymentBlockers: string[];
  suggestedPhases: string[];
  acceptanceCriteria: string[];
  deferUntilLater: string[];
}

export interface DiscoveryQuestion {
  id: string;
  prompt: string;
  whyItMatters: string;
}

export interface FeatureAdvice {
  feature: string;
  recommendation: "recommended" | "caution" | "defer";
  userReaction: string;
  builderImpact: string;
}

export interface ProposedPatch {
  path: string;
  before: string;
  after: string;
  summary: string;
  applied?: boolean;
}

export type PlanApprovalStatus = "pending_approval" | "approved" | "rejected";

export interface WorkspaceFixReport {
  repositoryId: string;
  plan: ChangePlan;
  diff: DiffPreview;
  blastRadius: string[];
  fixed: Array<{ path: string; summary: string }>;
  potentiallyBroken: string[];
  howFixed: string[];
  verificationSummary: ReturnType<typeof createVerificationSummary>;
  residualRisk: string[];
  guidanceForBuilder: string[];
  plainEnglishSummary?: string;
  safeToPr?: SafeToPrVerdict;
  planReviewStatus?: "draft" | "ready_for_review" | PlanApprovalStatus;
  pendingFixId?: string;
  patches?: ProposedPatch[];
  patchSource?: string;
  approvalStatus?: PlanApprovalStatus;
  previewSessionId?: string | null;
  previewUrl?: string | null;
  devPreviewStatus?: string | null;
  controlLayer?: ControlLayerSummary;
  /** Phase 2 — SWE-agent/Aider supervised patch loop metadata */
  fixLoop?: {
    enabled: boolean;
    iterations: number;
    refined: boolean;
    stopReason: string | null;
    gitDiscipline: string[];
  };
  /** Phase 2 — OpenHands-style sandbox session id when lifecycle enabled */
  sandboxSessionId?: string | null;
}

export interface WorkspaceChatContext {
  projectBrief?: ProjectBrief;
  hasCode?: boolean;
  loadedFilePaths?: string[];
  lastReport?: WorkspaceFixReport | null;
  githubUrl?: string | null;
  githubBranch?: string | null;
}

export interface ThinkingStep {
  id: string;
  label: string;
  status: "done" | "active" | "pending";
  detail?: string;
}

export interface FileActivity {
  path: string;
  status: "queued" | "reading" | "analyzing" | "planned" | "fixed" | "at-risk";
  detail: string;
}

export interface WorkspaceChatResult {
  reply: string;
  discoveryQuestions: DiscoveryQuestion[];
  featureAdvice: FeatureAdvice[];
  suggestedActions: string[];
  phase: "discovery" | "planning" | "building" | "review" | "export";
  thinkingSteps: ThinkingStep[];
  fileActivity: FileActivity[];
  triggerFix?: boolean;
  /** Pre-filled scoped request for the Fix panel; may or may not auto-run. */
  fixRequest?: string;
  plainEnglishSummary?: string;
  chatControl?: ChatControlSummary | null;
  reviewCoverage?: string;
  reviewFindings?: ReviewFinding[];
}

export const FIX_PIPELINE_STEPS: ThinkingStep[] = [
  { id: "parse", label: "Parse uploaded files", status: "pending" },
  { id: "scope", label: "Lock task scope", status: "pending" },
  { id: "context", label: "Build context budget", status: "pending" },
  { id: "symbols", label: "Build symbol graph", status: "pending" },
  { id: "blast", label: "Trace blast radius", status: "pending" },
  { id: "plan", label: "Create change plan", status: "pending" },
  { id: "guard", label: "Run patch guard", status: "pending" },
  { id: "diff", label: "Generate diff preview", status: "pending" },
  { id: "verify", label: "Run verification checks", status: "pending" },
  { id: "report", label: "Publish fix report", status: "pending" }
];

export function isBriefReady(brief?: Partial<ProjectBrief>): boolean {
  return Boolean(brief?.productName?.trim() && brief?.primaryWorkflow?.trim());
}

const DEFAULT_BRIEF: ProjectBrief = {
  productName: "New startup product",
  audience: "Early adopters",
  primaryWorkflow: "Sign up, complete core task, return weekly",
  authRequired: false,
  paymentsRequired: false,
  deploymentTarget: "vercel",
  constraints: [],
  longBuild: false
};

export function getDiscoveryQuestions(brief?: Partial<ProjectBrief>): DiscoveryQuestion[] {
  const merged = { ...DEFAULT_BRIEF, ...brief };
  return [
    {
      id: "audience",
      prompt: `Who is the primary user for ${merged.productName}, and what job are they hiring it to do?`,
      whyItMatters: "BootRise keeps architecture decisions aligned with real user behavior, not feature lists."
    },
    {
      id: "workflow",
      prompt: `Walk through the happy path for: "${merged.primaryWorkflow}". What must never break?`,
      whyItMatters: "The approval gate and blast-radius checks prioritize flows that matter at launch."
    },
    {
      id: "scope",
      prompt: merged.longBuild
        ? "This looks like a long build. Which milestone should ship first: landing, auth, core workflow, or admin?"
        : "What is the smallest shippable version you want live in the next two weeks?",
      whyItMatters: "BootRise sequences work so startups can bootstrap without overbuilding."
    },
    {
      id: "data",
      prompt: `Do you need accounts (${merged.authRequired ? "yes" : "optional"}) and payments (${merged.paymentsRequired ? "yes" : "no"}) on day one?`,
      whyItMatters: "Auth and billing multiply blast radius; BootRise flags that before code changes land."
    },
    {
      id: "deployment",
      prompt: `Where should this deploy (${merged.deploymentTarget}) and what must be exportable to GitHub or a zip download?`,
      whyItMatters: "Export paths are part of the MVP so you are never locked into the workspace."
    }
  ];
}
