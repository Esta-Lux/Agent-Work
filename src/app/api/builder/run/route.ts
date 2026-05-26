import { NextResponse } from "next/server";
import { getTemplateMarketplace, runAppBuilder, type BuilderIntake } from "@/lib/builder/app-builder";
import { requireUserForLegacyRoute } from "@/lib/auth/require-user-route";

export async function POST(request: Request) {
  const denied = await requireUserForLegacyRoute();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Partial<BuilderIntake> | null;

  if (!body?.idea?.trim()) {
    return NextResponse.json({ error: "A project idea is required." }, { status: 400 });
  }

  const intake: BuilderIntake = {
    idea: body.idea.trim(),
    appType: body.appType?.trim() || "website",
    targetUsers: body.targetUsers?.trim() || "small teams and operators",
    brandStyle: body.brandStyle?.trim() || "clean, modern, trustworthy",
    authNeeded: Boolean(body.authNeeded),
    paymentsNeeded: Boolean(body.paymentsNeeded),
    databaseNeeded: Boolean(body.databaseNeeded),
    adminPanelNeeded: Boolean(body.adminPanelNeeded),
    deploymentTarget: body.deploymentTarget ?? "vercel"
  };

  return NextResponse.json({
    product: "BootRise",
    run: runAppBuilder(intake),
    templateMarketplace: getTemplateMarketplace()
  });
}
