import { getProductionReadinessReport } from "@/lib/admin/readiness";

export async function runReleaseReadinessAgent() {
  return getProductionReadinessReport();
}
