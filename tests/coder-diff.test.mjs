import test from "node:test";
import assert from "node:assert/strict";
import {
  applyUnifiedDiffFromLlm,
  extractDiffBlocks,
  UNIFIED_DIFF_INSTRUCTIONS
} from "@/lib/workspace/unified-diff";

const SAMPLE_FILE = [
  "import { foo } from 'bar';",
  "",
  "export function hello() {",
  "  return 'world';",
  "}",
  ""
].join("\n");

test("extractDiffBlocks finds fenced diff blocks", () => {
  const text = "Here is the change:\n\n```diff\n--- a/file.ts\n+++ b/file.ts\n@@ -1,1 +1,1 @@\n-a\n+b\n```\n";
  const blocks = extractDiffBlocks(text);
  assert.equal(blocks.length, 1);
  assert.match(blocks[0], /--- a\/file\.ts/);
});

test("extractDiffBlocks accepts raw unified diff with no fence", () => {
  const text = "--- a/x.ts\n+++ b/x.ts\n@@ -1 +1 @@\n-old\n+new\n";
  const blocks = extractDiffBlocks(text);
  assert.equal(blocks.length, 1);
});

test("extractDiffBlocks returns empty when no diff present", () => {
  assert.deepEqual(extractDiffBlocks("just prose, no diff here"), []);
});

test("applyUnifiedDiffFromLlm applies a single-file edit", () => {
  const llmOutput = [
    "```diff",
    "--- a/src/hello.ts",
    "+++ b/src/hello.ts",
    "@@ -2,4 +2,4 @@",
    " ",
    " export function hello() {",
    "-  return 'world';",
    "+  return 'bootrise';",
    " }",
    "```"
  ].join("\n");
  const files = new Map([["src/hello.ts", SAMPLE_FILE]]);
  const result = applyUnifiedDiffFromLlm(llmOutput, { files });
  assert.equal(result.errors.length, 0, `errors: ${result.errors.join("; ")}`);
  assert.equal(result.patches.length, 1);
  assert.equal(result.patches[0].path, "src/hello.ts");
  assert.equal(result.patches[0].before, SAMPLE_FILE);
  assert.match(result.patches[0].after, /return 'bootrise'/);
  assert.doesNotMatch(result.patches[0].after, /return 'world'/);
});

test("applyUnifiedDiffFromLlm handles multi-file diffs in one block", () => {
  const second = "export const VERSION = '1.0.0';\n";
  const llmOutput = [
    "```diff",
    "--- a/src/hello.ts",
    "+++ b/src/hello.ts",
    "@@ -3,3 +3,3 @@",
    " export function hello() {",
    "-  return 'world';",
    "+  return 'two';",
    " }",
    "--- a/src/version.ts",
    "+++ b/src/version.ts",
    "@@ -1 +1 @@",
    "-export const VERSION = '1.0.0';",
    "+export const VERSION = '1.0.1';",
    "```"
  ].join("\n");
  const files = new Map([
    ["src/hello.ts", SAMPLE_FILE],
    ["src/version.ts", second]
  ]);
  const result = applyUnifiedDiffFromLlm(llmOutput, { files });
  assert.equal(result.errors.length, 0, `errors: ${result.errors.join("; ")}`);
  assert.equal(result.patches.length, 2);
  const paths = result.patches.map((p) => p.path).sort();
  assert.deepEqual(paths, ["src/hello.ts", "src/version.ts"]);
});

test("applyUnifiedDiffFromLlm reports error when no diff present", () => {
  const result = applyUnifiedDiffFromLlm("no diff here, just text", { files: new Map() });
  assert.equal(result.patches.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /no unified diff/i);
});

test("applyUnifiedDiffFromLlm reports error when hunk context does not match", () => {
  const llmOutput = [
    "```diff",
    "--- a/src/hello.ts",
    "+++ b/src/hello.ts",
    "@@ -1,2 +1,2 @@",
    " this line does not exist in the file",
    "-neither does this",
    "+new content",
    "```"
  ].join("\n");
  const files = new Map([["src/hello.ts", SAMPLE_FILE]]);
  const result = applyUnifiedDiffFromLlm(llmOutput, { files });
  assert.equal(result.patches.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /did not apply cleanly/);
});

test("applyUnifiedDiffFromLlm tolerates a/ and b/ prefix normalization", () => {
  const llmOutput = [
    "```diff",
    "--- src/hello.ts",
    "+++ src/hello.ts",
    "@@ -3,3 +3,3 @@",
    " export function hello() {",
    "-  return 'world';",
    "+  return 'no-prefix';",
    " }",
    "```"
  ].join("\n");
  const files = new Map([["src/hello.ts", SAMPLE_FILE]]);
  const result = applyUnifiedDiffFromLlm(llmOutput, { files });
  assert.equal(result.errors.length, 0, `errors: ${result.errors.join("; ")}`);
  assert.equal(result.patches.length, 1);
  assert.match(result.patches[0].after, /no-prefix/);
});

test("UNIFIED_DIFF_INSTRUCTIONS exposes a non-empty prompt", () => {
  assert.ok(UNIFIED_DIFF_INSTRUCTIONS.length > 50);
  assert.match(UNIFIED_DIFF_INSTRUCTIONS, /unified diff/i);
});
