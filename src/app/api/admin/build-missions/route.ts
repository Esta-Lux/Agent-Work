import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import {
  createAdminBuildMission,
  listAdminBuildMissions,
  getAdminBuildMission,
  updateAdminBuildMission,
  appendMissionEvent
} from "@/lib/admin-build/admin-build-store";
import type { CreateAdminBuildMissionInput, UpdateAdminBuildMissionInput } from "@/lib/admin-build/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAdminAuth(request, async (user, req) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);

    if (id) {
      const mission = getAdminBuildMission(id);
      if (!mission) {
        return NextResponse.json({ error: "Mission not found" }, { status: 404 });
      }
      return NextResponse.json({ mission });
    }

    const missions = listAdminBuildMissions({ limit, status: status ?? undefined });
    return NextResponse.json({ missions });
  });
}

export async function POST(request: Request) {
  return withAdminAuth(request, async (user, req) => {
    const body = (await req.json().catch(() => null)) as { action?: string } & Record<string, unknown>;

    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const action = body.action ?? "create";

    if (action === "create") {
      const input = body as unknown as CreateAdminBuildMissionInput;
      if (!input.title || !input.objective) {
        return NextResponse.json({ error: "Title and objective are required" }, { status: 400 });
      }

      const mission = createAdminBuildMission(input, user.id);
      return NextResponse.json({ mission }, { status: 201 });
    }

    if (action === "update") {
      const updateBody = body as unknown as { id: string } & UpdateAdminBuildMissionInput;
      const { id, ...updates } = updateBody;
      if (!id) {
        return NextResponse.json({ error: "Mission ID is required" }, { status: 400 });
      }

      const updated = updateAdminBuildMission(id, updates, user.id);
      if (!updated) {
        return NextResponse.json({ error: "Mission not found" }, { status: 404 });
      }
      return NextResponse.json({ mission: updated });
    }

    if (action === "event") {
      const { id, message, type, metadata } = body as {
        id: string;
        message: string;
        type: string;
        metadata?: Record<string, string | number | boolean>;
      };

      if (!id || !message || !type) {
        return NextResponse.json({ error: "ID, message, and type are required" }, { status: 400 });
      }

      const updated = appendMissionEvent(id, message, type, user.id, undefined, metadata);
      if (!updated) {
        return NextResponse.json({ error: "Mission not found" }, { status: 404 });
      }
      return NextResponse.json({ mission: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  });
}
