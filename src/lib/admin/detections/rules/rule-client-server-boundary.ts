import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { DetectionDraft } from "@/lib/admin/detections/types";

const CLIENT_DIR = "use client";
const IMPORT_REGEX = /import\s+(?:[^'"`]+\sfrom\s+)?["']([^"']+)["']/g;

function isClientFile(content: string): boolean {
  const head = content.split("\n").slice(0, 8).join("\n").trim();
  return head.startsWith('"use client"') || head.startsWith("'use client'");
}

function isServerImport(spec: string): boolean {
  if (/\.server(?:["'/]|$)/.test(spec)) return true;
  if (/^@\/lib\/workspace\/.*server/.test(spec)) return true;
  return false;
}

export function ruleClientServerBoundary(input: { files: SourceFileInput[] }): DetectionDraft[] {
  const out: DetectionDraft[] = [];
  for (const file of input.files) {
    if (!/\.(ts|tsx|jsx)$/.test(file.path)) continue;
    if (!isClientFile(file.content)) continue;
    IMPORT_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = IMPORT_REGEX.exec(file.content)) !== null) {
      const importPath = match[1];
      if (!isServerImport(importPath)) continue;
      out.push({
        kind: "client_server_boundary",
        severity: "critical",
        title: `Client component imports server module`,
        description: `${file.path} declares "use client" yet imports ${importPath}.`,
        affectedPaths: [file.path],
        evidence: { from: file.path, to: importPath },
        suggestedAction: "Move the server-only call behind a route handler or server action.",
        suggestedFixRequest: `Refactor ${file.path} so it no longer imports server module ${importPath}; expose the data via an API route.`,
        source: "scanner"
      });
    }
  }
  return out;
}
