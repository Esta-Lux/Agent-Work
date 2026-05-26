"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";

export function WebPreviewPanel({
  previewUrl,
  previewSessionId,
  framework,
  changedFiles,
  devPreviewStatus: initialDevStatus
}: {
  previewUrl: string | null;
  previewSessionId?: string | null;
  framework?: string;
  changedFiles?: string[];
  devPreviewStatus?: string | null;
}) {
  const [devStatus, setDevStatus] = useState(initialDevStatus ?? null);
  const [devLog, setDevLog] = useState<string[]>([]);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    setDevStatus(initialDevStatus ?? null);
  }, [initialDevStatus]);

  useEffect(() => {
    if (!previewSessionId) return;
    if (devStatus === "ready" || devStatus === "failed" || devStatus === "static_only" || devStatus === "disabled") {
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/workspace/preview/dev?sessionId=${encodeURIComponent(previewSessionId)}`);
        const data = (await res.json()) as {
          session?: { status?: string; log?: string[]; error?: string };
        };
        if (cancelled || !data.session) return;
        setDevStatus(data.session.status ?? null);
        if (data.session.log?.length) setDevLog(data.session.log);
        if (data.session.status === "ready") setIframeKey((k) => k + 1);
      } catch {
        /* retry */
      }
    };

    void poll();
    const timer = setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [previewSessionId, devStatus]);

  if (!previewUrl) {
    return (
      <p className="text-sm text-steel">
        Approve a plan to generate a web preview. BootRise runs npm install + dev server when package.json is present, or
        serves staged files as fallback.
      </p>
    );
  }

  const src = previewUrl.startsWith("http") ? previewUrl : previewUrl;
  const statusLabel =
    devStatus === "installing"
      ? "Installing dependencies"
      : devStatus === "starting"
        ? "Starting dev server"
        : devStatus === "ready"
          ? "Live dev server"
          : devStatus === "failed"
            ? "Dev server failed (static fallback)"
            : devStatus === "static_only"
              ? "Static preview"
              : null;

  return (
    <div className="mt-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-steel">Web preview</p>
        <div className="flex flex-wrap items-center gap-2">
          {framework ? <span className="text-xs text-graphite">{framework}</span> : null}
          {statusLabel ? <StatusPill label={statusLabel} tone={devStatus === "failed" ? "failed" : "neutral"} /> : null}
        </div>
      </div>
      {changedFiles && changedFiles.length > 0 ? (
        <p className="mb-2 text-xs text-steel">
          Changed: {changedFiles.slice(0, 5).join(", ")}
          {changedFiles.length > 5 ? ` +${changedFiles.length - 5} more` : ""}
        </p>
      ) : null}
      {devLog.length > 0 && devStatus !== "ready" ? (
        <pre className="mb-2 max-h-24 overflow-auto rounded bg-cloud p-2 text-[10px] leading-4 text-graphite">
          {devLog.slice(-6).join("\n")}
        </pre>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <iframe
          key={iframeKey}
          title="BootRise web preview"
          src={src}
          className="h-[min(420px,50vh)] w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
      <a href={src} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-signal">
        Open preview in new tab
      </a>
    </div>
  );
}
