import { getUnitEconomics } from "@/lib/business/unit-economics";

export async function runProviderCostAgent() {
  return getUnitEconomics();
}
