import { NextResponse } from "next/server";
import { memoryStore } from "@/lib/persistence/memory-store";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    store: memoryStore,
    livingLedger: {
      symbols: memoryStore.livingLedgerSymbols.length,
      epistemicEntries: memoryStore.epistemicLedger.length,
      sandboxRuns: memoryStore.sandboxRuns.length,
      dynamicPulses: memoryStore.dynamicPulses.length
    }
  });
}
