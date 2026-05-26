"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";

interface StreamRecord {
  id: string;
  runtime: string;
  transport: string;
  status: string;
  streamUrl: string | null;
  webrtcConfig?: { signalUrl: string | null };
}

export function DeviceStreamPanel({
  repositoryId,
  hasExpo,
  fileCount
}: {
  repositoryId: string | null;
  hasExpo: boolean;
  fileCount: number;
}) {
  const [streams, setStreams] = useState<StreamRecord[]>([]);
  const [activeRuntime, setActiveRuntime] = useState<"android" | "ios">("android");
  const [error, setError] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);

  const loadStreams = useCallback(async () => {
    if (!repositoryId) return;
    const res = await fetch(`/api/workspace/streams?repositoryId=${encodeURIComponent(repositoryId)}`);
    const data = (await res.json()) as { streams?: StreamRecord[]; error?: string };
    if (res.ok) setStreams(data.streams ?? []);
  }, [repositoryId]);

  async function provision(runtime: "android" | "ios") {
    if (!repositoryId) return;
    setProvisioning(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId, runtime, transport: "webrtc" })
      });
      const data = (await res.json()) as { stream?: StreamRecord; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Provision failed");
      if (data.stream) setStreams((s) => [data.stream!, ...s]);
      setActiveRuntime(runtime);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Provision failed");
    } finally {
      setProvisioning(false);
    }
  }

  useEffect(() => {
    void loadStreams();
  }, [loadStreams]);

  if (!hasExpo) {
    return (
      <p className="text-sm text-steel">
        Import <code className="text-xs">app/mobile</code> to enable device farm streams (Android / iOS).
      </p>
    );
  }

  const active = streams.find((s) => s.runtime === activeRuntime) ?? streams[0];
  const streamUrl = active?.streamUrl;

  return (
    <div className="rounded-lg border border-line bg-cloud/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-steel">Device farm stream</p>
        <StatusPill label={active?.status ?? "not provisioned"} tone="neutral" />
      </div>
      <p className="mt-2 text-sm leading-6 text-graphite">
        BootRise provisions WebRTC / noVNC streams for Expo monorepos ({fileCount} files). Streams are recorded in
        Supabase <code className="text-xs">bootrise_remote_streams</code> for audit and SOC2 traceability.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={provisioning || !repositoryId}
          className="cursor-pointer rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink disabled:opacity-50"
          onClick={() => void provision("android")}
        >
          Provision Android
        </button>
        <button
          type="button"
          disabled={provisioning || !repositoryId}
          className="cursor-pointer rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink disabled:opacity-50"
          onClick={() => void provision("ios")}
        >
          Provision iOS
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      {streamUrl ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-white">
          <iframe
            title={`${activeRuntime} device stream`}
            src={streamUrl}
            className="h-72 w-full border-0"
            allow="camera; microphone; autoplay"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-steel">
          Set <code>BOOTRISE_ANDROID_STREAM_URL</code> or <code>BOOTRISE_IOS_STREAM_URL</code> (use{" "}
          <code>{`{repositoryId}`}</code> placeholder) in .env, then provision.
        </p>
      )}
      {active?.webrtcConfig?.signalUrl ? (
        <p className="mt-2 text-[10px] text-steel">WebRTC signal: {active.webrtcConfig.signalUrl}</p>
      ) : null}
    </div>
  );
}
