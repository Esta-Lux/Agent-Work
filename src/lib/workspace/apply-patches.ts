import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export function applyPatchesToFiles(
  files: SourceFileInput[],
  patches: ProposedPatch[]
): { files: SourceFileInput[]; applied: string[]; skipped: string[] } {
  const byPath = new Map(files.map((f) => [f.path, f.content]));
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const patch of patches) {
    if (!byPath.has(patch.path)) {
      skipped.push(patch.path);
      continue;
    }
    byPath.set(patch.path, patch.after);
    applied.push(patch.path);
  }

  const nextFiles = files.map((f) => ({
    path: f.path,
    content: byPath.get(f.path) ?? f.content
  }));

  return { files: nextFiles, applied, skipped };
}

export function buildUnifiedDiff(before: string, after: string, path: string): string {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const header = `--- a/${path}\n+++ b/${path}\n`;
  if (before === after) return `${header}@@ No changes @@\n`;

  const max = Math.max(beforeLines.length, afterLines.length);
  const hunks: string[] = [`@@ -1,${beforeLines.length} +1,${afterLines.length} @@`];
  for (let i = 0; i < max; i++) {
    const b = beforeLines[i];
    const a = afterLines[i];
    if (b === a) {
      if (b !== undefined) hunks.push(` ${b}`);
      continue;
    }
    if (b !== undefined) hunks.push(`-${b}`);
    if (a !== undefined) hunks.push(`+${a}`);
  }
  return header + hunks.join("\n");
}
