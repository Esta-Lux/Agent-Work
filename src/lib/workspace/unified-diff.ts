import { applyPatch, parsePatch } from "diff";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export interface DiffApplyContext {
  files: Map<string, string>;
}

export interface DiffApplyResult {
  patches: ProposedPatch[];
  errors: string[];
}

/**
 * Extract unified diff blocks from an LLM response. Accepts:
 *  - fenced ```diff or ```patch blocks
 *  - the raw response if it already looks like a unified diff
 */
export function extractDiffBlocks(text: string): string[] {
  const blocks: string[] = [];
  const fencedRe = /```(?:diff|patch)?\s*\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = fencedRe.exec(text))) {
    const body = match[1];
    if (/^---\s/m.test(body) && /^\+\+\+\s/m.test(body)) {
      blocks.push(body);
    }
  }
  if (blocks.length > 0) return blocks;
  if (/^---\s/m.test(text) && /^\+\+\+\s/m.test(text)) {
    blocks.push(text);
  }
  return blocks;
}

function normalizeDiffPath(raw: string | undefined): string {
  if (!raw) return "";
  let p = raw.trim();
  if (p === "/dev/null") return "";
  if (p.startsWith("a/") || p.startsWith("b/")) p = p.slice(2);
  const tabIdx = p.indexOf("\t");
  if (tabIdx > 0) p = p.slice(0, tabIdx);
  return p;
}

/**
 * Parse unified diff blocks from LLM output and apply them against the supplied
 * file context, producing ProposedPatch records ({path, before, after, summary}).
 * Returns errors per-hunk rather than throwing so callers can decide to fall back.
 */
export function applyUnifiedDiffFromLlm(
  llmText: string,
  context: DiffApplyContext,
  options?: { defaultSummary?: string }
): DiffApplyResult {
  const errors: string[] = [];
  const patches: ProposedPatch[] = [];
  const blocks = extractDiffBlocks(llmText);
  if (blocks.length === 0) {
    return { patches, errors: ["no unified diff block found in LLM output"] };
  }

  for (const block of blocks) {
    let parsed: ReturnType<typeof parsePatch>;
    try {
      parsed = parsePatch(block);
    } catch (error) {
      errors.push(`parsePatch failed: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    for (const hunk of parsed) {
      const newPath = normalizeDiffPath(hunk.newFileName);
      const oldPath = normalizeDiffPath(hunk.oldFileName);
      const path = newPath || oldPath;
      if (!path) {
        errors.push("diff hunk missing file path");
        continue;
      }
      const before = context.files.get(path) ?? "";
      const after = applyPatch(before, hunk);
      if (after === false) {
        errors.push(`diff did not apply cleanly to ${path}`);
        continue;
      }
      patches.push({
        path,
        before,
        after,
        summary: options?.defaultSummary ?? `Updated ${path}`,
        applied: false
      });
    }
  }

  return { patches, errors };
}

/**
 * Prompt fragment to instruct an LLM to emit unified diff hunks. Shared by the
 * coder agent and the real-patches fallback so they speak the same dialect.
 */
export const UNIFIED_DIFF_INSTRUCTIONS = [
  "Return ONLY a fenced ```diff block containing one or more standard unified diff hunks:",
  "",
  "```diff",
  "--- a/path/to/file.ts",
  "+++ b/path/to/file.ts",
  "@@ -10,3 +10,4 @@",
  " unchanged context line",
  "-removed line",
  "+added line",
  "+another added line",
  "```",
  "",
  "Rules:",
  "- Use real repo-relative paths exactly as provided. Do not invent paths.",
  "- Hunks must apply cleanly against the current file content shown to you.",
  "- Include 2-3 lines of unchanged context above and below each change.",
  "- Keep the diff minimal — only the lines that actually change plus context.",
  "- For a new file, use `--- /dev/null` then `+++ b/path/to/new-file`.",
  "- Do NOT emit JSON. Do NOT embed full file contents. Diffs only."
].join("\n");
