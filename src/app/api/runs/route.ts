import { NextResponse } from "next/server";
import { getLastDynamicPulses, getLastSandboxRuns } from "@/lib/memory/run-history";
import { memoryStore } from "@/lib/persistence/memory-store";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    runs: getLastSandboxRuns(100),
    pulses: getLastDynamicPulses(100),
    rollbackSnapshots: memoryStore.rollbackSnapshots.slice(-100).reverse(),
    selfHealingAttempts: memoryStore.selfHealingAttempts.slice(-100).reverse()
  });
}

