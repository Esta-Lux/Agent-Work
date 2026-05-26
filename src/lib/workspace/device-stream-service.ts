import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { createRemoteStream } from "@/lib/infrastructure/control-plane";
import type { RemoteStreamRecord } from "@/lib/persistence/schema";

export type DeviceRuntime = "android" | "ios" | "web";

function streamUrlFor(runtime: DeviceRuntime, repositoryId: string): string | null {
  const templates: Record<DeviceRuntime, string | undefined> = {
    android:
      process.env.BOOTRISE_ANDROID_STREAM_URL?.trim() ||
      process.env.NEXT_PUBLIC_ANDROID_STREAM_URL?.trim(),
    ios: process.env.BOOTRISE_IOS_STREAM_URL?.trim() || process.env.NEXT_PUBLIC_IOS_STREAM_URL?.trim(),
    web:
      process.env.BOOTRISE_WEB_STREAM_URL?.trim() || process.env.NEXT_PUBLIC_WEB_STREAM_URL?.trim()
  };

  const template = templates[runtime];
  if (!template) return null;

  return template.replaceAll("{repositoryId}", repositoryId).replaceAll("{runtime}", runtime);
}

export async function provisionDeviceStream(input: {
  repositoryId: string;
  runtime: DeviceRuntime;
  transport?: "webrtc" | "novnc" | "guacamole";
}): Promise<RemoteStreamRecord & { webrtcConfig?: { signalUrl: string | null } }> {
  const url = streamUrlFor(input.runtime, input.repositoryId);
  const transport = input.transport ?? (url?.includes("webrtc") ? "webrtc" : "novnc");

  const record = await createRemoteStream({
    repositoryId: input.repositoryId,
    runtime: input.runtime === "web" ? "web" : "android",
    transport,
    exposedPorts: input.runtime === "ios" ? [8081] : [8081, 19000, 19001]
  });

  const streamUrl = url ?? record.streamUrl;
  const status = streamUrl ? "streaming" : "provisioning";

  await updateRemoteStreamRecord(record.id, { stream_url: streamUrl, status, updated_at: new Date().toISOString() });

  const signalUrl = process.env.BOOTRISE_WEBRTC_SIGNAL_URL?.trim()?.replaceAll("{repositoryId}", input.repositoryId) ?? null;

  return {
    ...record,
    streamUrl,
    status,
    transport,
    webrtcConfig: transport === "webrtc" ? { signalUrl } : undefined
  };
}

export async function listDeviceStreams(repositoryId: string): Promise<RemoteStreamRecord[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("bootrise_remote_streams")
    .select("*")
    .eq("repository_id", repositoryId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    repositoryId: row.repository_id as string,
    runtime: row.runtime as RemoteStreamRecord["runtime"],
    transport: row.transport as RemoteStreamRecord["transport"],
    status: row.status as RemoteStreamRecord["status"],
    streamUrl: (row.stream_url as string) ?? null,
    exposedPorts: (row.exposed_ports as number[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }));
}

async function updateRemoteStreamRecord(id: string, patch: Record<string, unknown>) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return;
  await supabase.from("bootrise_remote_streams").update(patch).eq("id", id);
}
