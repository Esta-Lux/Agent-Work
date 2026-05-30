import type { ChangePlan } from "@/lib/types/core";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { buildScopeContract } from "@/lib/control/scope-contract";

export function runScopeContractAgent(input: {
  request: string;
  plan: ChangePlan;
  files: SourceFileInput[];
  patches?: Array<{ path: string }>;
}) {
  return buildScopeContract(input);
}
