import { describe, it } from "node:test";
import assert from "node:assert/strict";

const {
  buildWorkspaceProjectPath,
  createDefaultProjectBrief,
  createLaunchProjectSeed
} = await import("../src/lib/workspace/project-launch.ts");

describe("project launch helpers", () => {
  it("builds encoded workspace paths", () => {
    assert.equal(buildWorkspaceProjectPath("proj/alpha beta"), "/workspace/proj%2Falpha%20beta");
  });

  it("creates a blank project seed with default brief fields", () => {
    const blank = createLaunchProjectSeed("blank");
    const brief = createDefaultProjectBrief();

    assert.equal(blank.name, "Untitled project");
    assert.equal(blank.brief.productName, "Untitled project");
    assert.equal(blank.brief.primaryWorkflow, "Stand up the core product workflow.");
    assert.equal(brief.deploymentTarget, "vercel");
    assert.deepEqual(brief.constraints, []);
  });

  it("creates an import-oriented project seed", () => {
    const imported = createLaunchProjectSeed("import", "BootRise Demo");
    assert.equal(imported.name, "BootRise Demo");
    assert.equal(imported.brief.productName, "BootRise Demo");
    assert.match(imported.brief.primaryWorkflow, /Import a repository/i);
  });
});
