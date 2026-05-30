import type { SelfAgentPatchValidation } from "@/lib/agents/admin/self-agent-control-bridge";

export function runSelfAgentQa(input: { missionId: string; validations: SelfAgentPatchValidation[] }) {
  const blockers = input.validations.flatMap((validation) => validation.blockers);
  const warnings = input.validations.flatMap((validation) => validation.warnings);
  return {
    missionId: input.missionId,
    passed: blockers.length === 0,
    blockers,
    warnings
  };
}
