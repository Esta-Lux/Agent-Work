"use client";

import { StatusPill } from "@/components/status-pill";

export function MobilePreviewPanel({
  hasExpo,
  fileCount
}: {
  hasExpo: boolean;
  fileCount: number;
}) {
  if (!hasExpo) {
    return (
      <p className="text-sm text-steel">
        No Expo / React Native package detected. Import <code className="text-xs">app/mobile</code> for mobile preview
        guidance.
      </p>
    );
  }

  const streamUrl = process.env.NEXT_PUBLIC_MOBILE_PREVIEW_URL?.trim();

  return (
    <div className="rounded-lg border border-line bg-cloud/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase text-steel">iOS / Android preview</p>
        <StatusPill label="Phase 3 stream" tone="neutral" />
      </div>
      <p className="mt-3 text-sm leading-6 text-graphite">
        BootRise detected an Expo monorepo ({fileCount} files loaded). Full device streaming requires a dev client or
        emulator farm — configure <code className="text-xs">NEXT_PUBLIC_MOBILE_PREVIEW_URL</code> to embed a WebRTC / noVNC
        stream, or run <code className="text-xs">npm run start</code> in <code className="text-xs">app/mobile</code> locally
        while reviewing patches.
      </p>
      {streamUrl ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-white">
          <iframe title="Mobile device stream" src={streamUrl} className="h-64 w-full border-0" sandbox="allow-scripts allow-same-origin" />
        </div>
      ) : (
        <ul className="mt-3 list-inside list-disc text-xs text-graphite">
          <li>Approve patches, then start Expo in app/mobile on your machine.</li>
          <li>Use Verify web preview for frontend; use a physical device for navigation UX.</li>
          <li>Admin can wire a stream URL when device farm is available.</li>
        </ul>
      )}
    </div>
  );
}
