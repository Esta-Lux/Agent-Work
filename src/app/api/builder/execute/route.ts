import { NextResponse } from "next/server";
import type { BuilderRun } from "@/lib/builder/app-builder";
import { executeBuilderRun } from "@/lib/builder/workspace-executor";

interface BuilderExecuteBody {
  run?: BuilderRun;
  approved?: boolean;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as BuilderExecuteBody | null;

  if (!body?.run) {
    return NextResponse.json({ error: "run is required." }, { status: 400 });
  }

  const result = await executeBuilderRun({
    run: body.run,
    approved: body.approved === true
  });

  const failed = result.verification.some((check) => check.status === "fail");

  return NextResponse.json(
    {
      product: "BootRise",
      result
    },
    { status: failed ? 409 : 200 }
  );
}
