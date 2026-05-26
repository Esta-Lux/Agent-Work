export const CREDIT_PRICING: Record<string, number> = {
  basic_memory_lookup: 1,
  context_gate: 2,
  file_summary: 5,
  small_patch_plan: 25,
  small_patch_generation: 50,
  safe_to_pr_report: 25,
  basic_security_scan: 50,
  large_repo_scan: 500,
  deep_security_scan: 1000,
  deployment_readiness: 1000,
  premium_patch_generation: 1000,
  chat: 10,
  code_review: 40,
  github_import: 100,
  sandbox: 75,
  draft_pr: 50
};

export function estimateCreditsForAction(action: string, overrides?: Partial<Record<string, number>>): number {
  const table = { ...CREDIT_PRICING, ...overrides };
  return table[action] ?? 25;
}
