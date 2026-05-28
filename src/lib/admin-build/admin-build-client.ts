import type {
  AdminBuildMission,
  CreateAdminBuildMissionInput,
  UpdateAdminBuildMissionInput
} from "./types";

export async function fetchAdminBuildMissions(options?: { limit?: number; status?: string }): Promise<AdminBuildMission[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.status) params.set("status", options.status);

  const res = await fetch(`/api/admin/build-missions?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch missions");
  const data = (await res.json()) as { missions: AdminBuildMission[] };
  return data.missions;
}

export async function fetchAdminBuildMission(id: string): Promise<AdminBuildMission | null> {
  const res = await fetch(`/api/admin/build-missions?id=${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch mission");
  const data = (await res.json()) as { mission: AdminBuildMission };
  return data.mission;
}

export async function createAdminBuildMissionClient(input: CreateAdminBuildMissionInput): Promise<AdminBuildMission> {
  const res = await fetch("/api/admin/build-missions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", ...input })
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: "Create failed" }))) as { error: string };
    throw new Error(err.error);
  }
  const data = (await res.json()) as { mission: AdminBuildMission };
  return data.mission;
}

export async function updateAdminBuildMissionClient(
  id: string,
  updates: UpdateAdminBuildMissionInput
): Promise<AdminBuildMission> {
  const res = await fetch("/api/admin/build-missions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", id, ...updates })
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: "Update failed" }))) as { error: string };
    throw new Error(err.error);
  }
  const data = (await res.json()) as { mission: AdminBuildMission };
  return data.mission;
}

export async function appendMissionEventClient(
  id: string,
  message: string,
  type: string,
  metadata?: Record<string, string | number | boolean>
): Promise<AdminBuildMission> {
  const res = await fetch("/api/admin/build-missions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "event", id, message, type, metadata })
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: "Event append failed" }))) as { error: string };
    throw new Error(err.error);
  }
  const data = (await res.json()) as { mission: AdminBuildMission };
  return data.mission;
}
