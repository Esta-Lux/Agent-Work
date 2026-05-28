import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("repo-store incremental sync writes only changed files", async () => {
  const originalCwd = process.cwd();
  const tempRoot = mkdtempSync(join(tmpdir(), "bootrise-repo-"));
  process.chdir(tempRoot);

  try {
    const { syncRepoFiles, readRepoFiles, getRepoManifest, computeFileHash } = await import(
      "../src/lib/workspace/repo-store.ts"
    );

    const first = syncRepoFiles("repo_test", [
      { path: "src/a.ts", content: "export const a = 1;" },
      { path: "src/b.ts", content: "export const b = 2;" }
    ], { remoteUrl: "https://github.com/example/demo", branch: "main", fullReplace: true });

    assert.equal(first.written.length, 2);
    assert.equal(first.unchanged.length, 0);
    assert.equal(first.totalFiles, 2);

    const second = syncRepoFiles("repo_test", [
      { path: "src/a.ts", content: "export const a = 1;" },
      { path: "src/b.ts", content: "export const b = 3;" }
    ], { fullReplace: true });

    assert.equal(second.written.length, 1);
    assert.equal(second.unchanged.length, 1);
    assert.equal(second.removed.length, 0);

    const files = readRepoFiles("repo_test");
    assert.equal(files.length, 2);
    assert.ok(files.find((f) => f.path === "src/b.ts")?.content.includes("b = 3"));

    const manifest = getRepoManifest("repo_test");
    assert.ok(manifest);
    assert.equal(manifest.files["src/a.ts"].sha256, computeFileHash("export const a = 1;"));
  } finally {
    process.chdir(originalCwd);
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("repo-store snapshots can be restored", async () => {
  const originalCwd = process.cwd();
  const tempRoot = mkdtempSync(join(tmpdir(), "bootrise-repo-"));
  process.chdir(tempRoot);

  try {
    const { syncRepoFiles, createRepoSnapshot, restoreRepoSnapshot, readRepoFile } = await import(
      "../src/lib/workspace/repo-store.ts"
    );

    syncRepoFiles("repo_snap", [{ path: "README.md", content: "# v1" }], { fullReplace: true });
    const snap = createRepoSnapshot("repo_snap", "before-v2");
    syncRepoFiles("repo_snap", [{ path: "README.md", content: "# v2" }], { fullReplace: true });

    assert.equal(readRepoFile("repo_snap", "README.md")?.content, "# v2");

    restoreRepoSnapshot("repo_snap", snap.id);
    assert.equal(readRepoFile("repo_snap", "README.md")?.content, "# v1");
  } finally {
    process.chdir(originalCwd);
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("repo-store accepts Next.js dynamic-route paths and rejects real traversal", async () => {
  const originalCwd = process.cwd();
  const tempRoot = mkdtempSync(join(tmpdir(), "bootrise-repo-"));
  process.chdir(tempRoot);

  try {
    const { syncRepoFiles, readRepoFile } = await import("../src/lib/workspace/repo-store.ts");

    const dynamicPath = "src/app/api/workspace/preview/proxy/[sessionId]/[[...path]]/route.ts";
    const result = syncRepoFiles(
      "repo_dyn",
      [
        { path: dynamicPath, content: "export async function GET() { return new Response('ok'); }" },
        { path: "src/app/api/[...slug]/route.ts", content: "export async function GET() {}" }
      ],
      { fullReplace: true }
    );
    assert.equal(result.written.length, 2);
    assert.ok(readRepoFile("repo_dyn", dynamicPath)?.content.includes("Response('ok')"));

    assert.throws(
      () => syncRepoFiles("repo_dyn", [{ path: "../etc/passwd", content: "x" }], { fullReplace: true }),
      /Unsafe path rejected/i
    );
    assert.throws(
      () => syncRepoFiles("repo_dyn", [{ path: "src/../etc/passwd", content: "x" }], { fullReplace: true }),
      /Unsafe path rejected/i
    );
  } finally {
    process.chdir(originalCwd);
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
