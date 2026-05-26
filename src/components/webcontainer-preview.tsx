"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import {
  buildWebContainerFileTree,
  detectWebContainerWorkdir,
  selectWebContainerFiles
} from "@/lib/workspace/webcontainer-tree";

type PreviewFile = { path: string; content: string };

export function WebContainerPreview({
  files,
  active
}: {
  files: PreviewFile[];
  active: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "booting" | "installing" | "starting" | "ready" | "failed" | "unsupported">(
    "idle"
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const containerRef = useRef<Awaited<ReturnType<typeof import("@webcontainer/api").WebContainer.boot>> | null>(null);

  const appendLog = useCallback((line: string) => {
    setLog((prev) => [...prev.slice(-40), line]);
  }, []);

  useEffect(() => {
    if (!active || files.length === 0) return;

    let cancelled = false;

    async function boot() {
      try {
        setStatus("booting");
        appendLog("Booting in-browser WebContainer (no host Node required)…");

        if (typeof window !== "undefined" && !window.crossOriginIsolated) {
          setStatus("unsupported");
          appendLog("Cross-origin isolation is required. Restart dev server after next.config COOP/COEP headers apply.");
          return;
        }

        const { WebContainer } = await import("@webcontainer/api");
        const instance = await WebContainer.boot();
        if (cancelled) return;
        containerRef.current = instance;

        const subset = selectWebContainerFiles(files);
        appendLog(`Mounting ${subset.length} files into WebContainer…`);
        await instance.mount(buildWebContainerFileTree(subset) as import("@webcontainer/api").FileSystemTree);

        const workdir = detectWebContainerWorkdir(subset);
        const shellCmd = (cmd: string) => ["sh", "-c", workdir === "." ? cmd : `cd ${workdir} && ${cmd}`];

        setStatus("installing");
        appendLog(`Running npm install in ${workdir}…`);
        const installArgs = shellCmd("npm install --ignore-scripts --no-audit --no-fund");
        const install = await instance.spawn(installArgs[0], installArgs.slice(1));
        install.output.pipeTo(
          new WritableStream({
            write(data) {
              appendLog(data.trim().slice(0, 120));
            }
          })
        );
        const installCode = await install.exit;
        if (installCode !== 0) {
          throw new Error(`npm install exited with ${installCode}`);
        }

        setStatus("starting");
        appendLog("Starting dev server…");
        instance.on("server-ready", (port, url) => {
          appendLog(`Dev server ready on port ${port}`);
          setPreviewUrl(url);
          setStatus("ready");
        });

        const devArgs = shellCmd("npm run dev -- --host 0.0.0.0 --port 5173");
        const dev = await instance.spawn(devArgs[0], devArgs.slice(1));
        dev.output.pipeTo(
          new WritableStream({
            write(data) {
              if (/ready|localhost|error/i.test(data)) appendLog(data.trim().slice(0, 120));
            }
          })
        );
      } catch (error) {
        if (cancelled) return;
        setStatus("failed");
        appendLog(error instanceof Error ? error.message : "WebContainer failed");
      }
    }

    void boot();

    return () => {
      cancelled = true;
      try {
        containerRef.current?.teardown?.();
      } catch {
        /* ignore */
      }
      containerRef.current = null;
    };
  }, [active, files, appendLog]);

  if (!active) {
    return (
      <p className="text-sm text-steel">
        Approve a plan to start the in-browser WebContainer preview (runs npm entirely in your browser).
      </p>
    );
  }

  const statusLabel =
    status === "ready"
      ? "Live — in-browser"
      : status === "unsupported"
        ? "Needs COOP/COEP headers"
        : status === "failed"
          ? "WebContainer failed"
          : status === "idle"
            ? "Waiting"
            : status;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase text-steel">WebContainer preview</p>
        <StatusPill label={statusLabel} tone={status === "failed" || status === "unsupported" ? "failed" : "neutral"} />
      </div>
      <p className="text-xs leading-5 text-graphite">
        BootRise runs npm install and the dev server inside your browser via WebContainer — no local Node process on the
        server. Ideal for large monorepos when cross-origin isolation is enabled.
      </p>
      {log.length > 0 ? (
        <pre className="max-h-28 overflow-auto rounded bg-cloud p-2 text-[10px] leading-4 text-graphite">{log.join("\n")}</pre>
      ) : null}
      {previewUrl ? (
        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <iframe title="WebContainer dev server" src={previewUrl} className="h-[min(420px,50vh)] w-full border-0" />
        </div>
      ) : null}
      {previewUrl ? (
        <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-signal">
          Open WebContainer preview
        </a>
      ) : null}
    </div>
  );
}
