export type OnboardingStepId =
  | "connect_repo"
  | "import_files"
  | "build_brain"
  | "run_roadmap"
  | "pick_mission"
  | "run_fix"
  | "review_diff"
  | "approve_patch"
  | "run_verify"
  | "open_pr_or_export";

export interface OnboardingStep {
  id: OnboardingStepId;
  label: string;
}

export interface OnboardingState {
  dismissed: boolean;
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: "connect_repo", label: "Connect GitHub repo" },
  { id: "import_files", label: "Import repo files" },
  { id: "build_brain", label: "Build Project Brain" },
  { id: "run_roadmap", label: "Run Architecture Roadmap" },
  { id: "pick_mission", label: "Pick one suggested mission" },
  { id: "run_fix", label: "Run scoped fix" },
  { id: "review_diff", label: "Review diff" },
  { id: "approve_patch", label: "Approve patch" },
  { id: "run_verify", label: "Run verify" },
  { id: "open_pr_or_export", label: "Open draft PR or export bundle" }
];

export function createDefaultOnboardingState(): OnboardingState {
  return {
    dismissed: false,
    currentStep: "connect_repo",
    completedSteps: []
  };
}

export function deriveOnboardingState(input: {
  repoConnected: boolean;
  brainIndexed: boolean;
  roadmapReady: boolean;
  fixRequest: string;
  hasReport: boolean;
  patchApproved: boolean;
  verified: boolean;
  exported: boolean;
  dismissed?: boolean;
}): OnboardingState {
  const completedSteps: OnboardingStepId[] = [];
  if (input.repoConnected) {
    completedSteps.push("connect_repo", "import_files");
  }
  if (input.brainIndexed) completedSteps.push("build_brain");
  if (input.roadmapReady) completedSteps.push("run_roadmap");
  if (input.fixRequest.trim()) completedSteps.push("pick_mission");
  if (input.hasReport) completedSteps.push("run_fix", "review_diff");
  if (input.patchApproved) completedSteps.push("approve_patch");
  if (input.verified) completedSteps.push("run_verify");
  if (input.exported) completedSteps.push("open_pr_or_export");

  const currentStep = ONBOARDING_STEPS.find((step) => !completedSteps.includes(step.id))?.id ?? "open_pr_or_export";
  return {
    dismissed: Boolean(input.dismissed),
    currentStep,
    completedSteps: [...new Set(completedSteps)]
  };
}
