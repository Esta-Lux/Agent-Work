import { NextResponse } from "next/server";
import { createProjectBlueprint } from "@/lib/blueprints/project-blueprint";
import { memoryStore } from "@/lib/persistence/memory-store";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    blueprints: memoryStore.projectBlueprints
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    productType?: string;
    audience?: string;
    primaryWorkflow?: string;
    authRequired?: boolean;
    paymentsRequired?: boolean;
    realtimeRequired?: boolean;
  } | null;

  if (!body?.name || !body.productType || !body.audience || !body.primaryWorkflow) {
    return NextResponse.json(
      {
        error: "name, productType, audience, and primaryWorkflow are required."
      },
      { status: 400 }
    );
  }

  const blueprint = await createProjectBlueprint({
    name: body.name,
    productType: body.productType,
    audience: body.audience,
    primaryWorkflow: body.primaryWorkflow,
    authRequired: body.authRequired,
    paymentsRequired: body.paymentsRequired,
    realtimeRequired: body.realtimeRequired
  });

  return NextResponse.json({
    product: "BootRise",
    blueprint,
    nextAction: "Approve the blueprint before generating files."
  });
}
