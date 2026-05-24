import { NextResponse } from "next/server";
import { memoryStore } from "@/lib/persistence/memory-store";

export async function GET() {
  return NextResponse.json({
    product: "VerityOS",
    store: memoryStore
  });
}

