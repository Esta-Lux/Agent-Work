import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import { buildUnifiedDiff } from "@/lib/workspace/apply-patches";

export interface PreviewSession {
  id: string;
  entryUrl: string;
  framework: string;
  changedFiles: string[];
  createdAt: string;
}

export const PREVIEW_ROOT = resolve(process.cwd(), ".bootrise", "preview");

export function getPreviewSessionRoot(sessionId: string): string {
  return join(PREVIEW_ROOT, sessionId);
}

export function createWorkspacePreviewSession(input: {
  files: SourceFileInput[];
  patches?: ProposedPatch[];
  repositoryId?: string;
}): PreviewSession {
  const id = `prev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const root = join(PREVIEW_ROOT, id);
  mkdirSync(root, { recursive: true });

  for (const file of input.files) {
    const safe = file.path.replace(/^(\.\.(\/|\\|$))+/, "");
    const target = join(root, safe);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content, "utf8");
  }

  const changedFiles = input.patches?.map((p) => p.path) ?? [];
  const entry = detectPreviewEntry(input.files);
  let entryUrl = `/api/workspace/preview/serve/${id}`;

  if (entry) {
    entryUrl = `${entryUrl}/${entry}`;
  } else {
    const reportHtml = buildPreviewReportHtml(input.patches ?? [], input.files.length);
    writeFileSync(join(root, "index.html"), reportHtml, "utf8");
    entryUrl = `${entryUrl}/index.html`;
  }

  const framework = detectFramework(input.files);

  return {
    id,
    entryUrl,
    framework,
    changedFiles,
    createdAt: new Date().toISOString()
  };
}

export function readPreviewFile(sessionId: string, relativePath: string): string | null {
  const safe = relativePath.replace(/^(\.\.(\/|\\|$))+/, "").replace(/^\//, "");
  const target = join(PREVIEW_ROOT, sessionId, safe);
  if (!existsSync(target)) return null;
  try {
    return readFileSync(target, "utf8");
  } catch {
    return null;
  }
}

function detectPreviewEntry(files: SourceFileInput[]): string | null {
  const candidates = [
    "index.html",
    "app/frontend/index.html",
    "app/mobile/index.html",
    "public/index.html",
    "dist/index.html"
  ];
  const paths = new Set(files.map((f) => f.path));
  for (const c of candidates) {
    if (paths.has(c)) return c;
  }
  const html = files.find((f) => f.path.endsWith(".html"));
  return html?.path ?? null;
}

function detectFramework(files: SourceFileInput[]): string {
  const paths = files.map((f) => f.path).join("\n");
  if (paths.includes("app/mobile/package.json")) return "Expo / React Native";
  if (paths.includes("app/frontend/vite.config")) return "Vite / React";
  if (paths.includes("app/backend/main.py")) return "FastAPI";
  if (paths.includes("next.config")) return "Next.js";
  return "Static / mixed";
}

function buildPreviewReportHtml(patches: ProposedPatch[], fileCount: number): string {
  const diffBlocks = patches
    .map((p) => {
      const diff = buildUnifiedDiff(p.before, p.after, p.path);
      return `<section class="file"><h3>${escapeHtml(p.path)}</h3><p>${escapeHtml(p.summary)}</p><pre>${escapeHtml(diff)}</pre></section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BootRise Preview</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #f4f6f8; color: #111; }
    header { padding: 20px 24px; background: #0f172a; color: #fff; }
    main { padding: 24px; max-width: 960px; margin: 0 auto; }
    .file { background: #fff; border: 1px solid #dbe2ea; margin-bottom: 16px; padding: 16px; }
    pre { overflow: auto; font-size: 11px; line-height: 1.45; background: #0f172a; color: #e2e8f0; padding: 12px; }
    h1 { margin: 0; font-size: 22px; }
    p.meta { opacity: 0.85; font-size: 14px; }
  </style>
</head>
<body>
  <header>
    <h1>BootRise change preview</h1>
    <p class="meta">${patches.length} patched file(s) · ${fileCount} files in workspace</p>
  </header>
  <main>
    ${diffBlocks || "<p>No patches to display.</p>"}
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
