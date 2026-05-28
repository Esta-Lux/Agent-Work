import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("self-repo snapshot honors denylist and gitignore", async () => {
  const originalCwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), "bootrise-self-"));

  try {
    writeFileSync(join(root, ".gitignore"), "secrets/\nnotes.local.md\n");
    mkdirSync(join(root, "src"), { recursive: true });
    mkdirSync(join(root, "src", "lib"), { recursive: true });
    mkdirSync(join(root, "node_modules"), { recursive: true });
    mkdirSync(join(root, ".next"), { recursive: true });
    mkdirSync(join(root, ".git"), { recursive: true });
    mkdirSync(join(root, "secrets"), { recursive: true });

    writeFileSync(join(root, "src", "index.ts"), "export const main = 1;");
    writeFileSync(join(root, "src", "lib", "util.ts"), "export const util = 'ok';");
    writeFileSync(join(root, "node_modules", "junk.js"), "should be skipped");
    writeFileSync(join(root, ".next", "build.json"), "{}");
    writeFileSync(join(root, ".git", "HEAD"), "ref");
    writeFileSync(join(root, "secrets", "token.txt"), "shhh");
    writeFileSync(join(root, "notes.local.md"), "private");
    writeFileSync(join(root, ".env"), "SECRET=please-skip");
    writeFileSync(join(root, ".env.example"), "OK=keep");

    process.env.BOOTRISE_SELF_REPO_ROOT = root;
    process.chdir(root);

    const { loadSelfRepoSnapshot, getSelfRepoRoot, getSelfRepoDefaultBranch, SELF_REPOSITORY_ID } = await import(
      "../src/lib/admin/self-repo.ts"
    );

    assert.equal(getSelfRepoRoot(), root);
    assert.equal(typeof SELF_REPOSITORY_ID, "string");
    assert.equal(getSelfRepoDefaultBranch().length > 0, true);

    const files = loadSelfRepoSnapshot();
    const paths = files.map((file) => file.path).sort();

    assert.ok(paths.includes("src/index.ts"), "expected src/index.ts in snapshot");
    assert.ok(paths.includes("src/lib/util.ts"), "expected src/lib/util.ts in snapshot");
    assert.ok(paths.includes(".env.example"), ".env.example must remain visible");
    assert.ok(!paths.some((p) => p.startsWith("node_modules/")), "node_modules must be denied");
    assert.ok(!paths.some((p) => p.startsWith(".next/")), ".next must be denied");
    assert.ok(!paths.some((p) => p.startsWith(".git/")), ".git must be denied");
    assert.ok(!paths.some((p) => p.startsWith("secrets/")), "gitignore directory must be skipped");
    assert.ok(!paths.includes("notes.local.md"), "gitignore file pattern must be skipped");
    assert.ok(!paths.includes(".env"), ".env must be denied");
  } finally {
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test("self-repo snapshot respects maxFiles limit", async () => {
  const originalCwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), "bootrise-self-cap-"));

  try {
    mkdirSync(join(root, "src"), { recursive: true });
    for (let index = 0; index < 12; index += 1) {
      writeFileSync(join(root, "src", `f${index}.ts`), `export const f${index} = ${index};`);
    }
    process.env.BOOTRISE_SELF_REPO_ROOT = root;
    process.chdir(root);

    const { loadSelfRepoSnapshot } = await import("../src/lib/admin/self-repo.ts");
    const files = loadSelfRepoSnapshot({ maxFiles: 5 });
    assert.equal(files.length, 5);
  } finally {
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});
