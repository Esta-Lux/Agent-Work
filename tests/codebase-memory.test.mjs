import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function setupSelfRepo() {
  const root = mkdtempSync(join(tmpdir(), "bootrise-codebase-memory-"));
  mkdirSync(join(root, "src", "app", "api", "foo"), { recursive: true });
  mkdirSync(join(root, "src", "app", "api", "bar"), { recursive: true });
  mkdirSync(join(root, "src", "lib"), { recursive: true });
  mkdirSync(join(root, ".bootrise", "admin"), { recursive: true });

  writeFileSync(
    join(root, "src", "app", "api", "foo", "route.ts"),
    "export async function GET() { return new Response('ok'); }\nexport async function POST() { return new Response('ok'); }\n"
  );
  writeFileSync(
    join(root, "src", "app", "api", "bar", "route.ts"),
    "export async function GET() { return new Response('hi'); }\n"
  );
  writeFileSync(join(root, "src", "lib", "util.ts"), "export const value = 1;\n");
  writeFileSync(join(root, "README.md"), "# memory test repo\n");
  return root;
}

test("codebase memory builds route map and counts symbols", async () => {
  const originalCwd = process.cwd();
  const root = setupSelfRepo();
  process.env.BOOTRISE_SELF_REPO_ROOT = root;
  process.chdir(root);

  try {
    const { loadCodebaseMemory, refreshCodebaseMemory, recentlyEditedFiles, summarizeForPrompt } = await import(
      "../src/lib/admin/codebase-memory.ts"
    );

    const snapshot = await loadCodebaseMemory({ refresh: true });
    assert.ok(snapshot.fileCount >= 3);
    assert.ok(snapshot.symbolCount > 0);
    assert.ok(Array.isArray(snapshot.routeMap));
    assert.ok(snapshot.routeMap.length >= 2);

    const foo = snapshot.routeMap.find((r) => r.path === "/api/foo");
    assert.ok(foo, "expected /api/foo route in route map");
    assert.deepEqual([...foo.methods].sort(), ["GET", "POST"]);
    assert.equal(foo.handlerFile, "src/app/api/foo/route.ts");

    const bar = snapshot.routeMap.find((r) => r.path === "/api/bar");
    assert.ok(bar, "expected /api/bar route in route map");
    assert.deepEqual(bar.methods, ["GET"]);

    const text = summarizeForPrompt(snapshot);
    assert.ok(text.includes("Codebase memory @"));
    assert.ok(text.includes("/api/foo"));

    const future = new Date(Date.now() + 5_000);
    utimesSync(join(root, "src", "lib", "util.ts"), future, future);
    const refreshed = await refreshCodebaseMemory();
    const edits = recentlyEditedFiles(10);
    assert.ok(edits.length > 0);
    assert.equal(edits[0].path, "src/lib/util.ts");
    assert.ok(refreshed.recentEdits.length > 0);
  } finally {
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test("codebase memory cache returns cached snapshot when fresh and rebuilds when refresh requested", async () => {
  const originalCwd = process.cwd();
  const root = setupSelfRepo();
  process.env.BOOTRISE_SELF_REPO_ROOT = root;
  process.chdir(root);

  try {
    const { loadCodebaseMemory, refreshCodebaseMemory } = await import(
      "../src/lib/admin/codebase-memory.ts"
    );

    const first = await refreshCodebaseMemory();
    const cached = await loadCodebaseMemory();
    assert.equal(cached.generatedAt, first.generatedAt);

    const rebuilt = await loadCodebaseMemory({ refresh: true });
    assert.notEqual(rebuilt.generatedAt, first.generatedAt);
  } finally {
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});
