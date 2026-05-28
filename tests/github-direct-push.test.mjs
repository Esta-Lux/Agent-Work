import test from "node:test";
import assert from "node:assert/strict";

test("pushFilesDirectlyToBranch refuses main without confirmation", async () => {
  const previousToken = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = "ghp_test_token_for_unit";

  try {
    const { pushFilesDirectlyToBranch } = await import("../src/lib/workspace/github-direct-push.ts");

    await assert.rejects(
      () =>
        pushFilesDirectlyToBranch({
          remoteUrl: "https://github.com/example/demo.git",
          branch: "main",
          files: [{ path: "README.md", content: "# hi" }],
          commitMessage: "test",
          confirmDirectPushToMain: false
        }),
      /Direct push to main requires confirmDirectPushToMain=true/i
    );

    await assert.rejects(
      () =>
        pushFilesDirectlyToBranch({
          remoteUrl: "https://github.com/example/demo.git",
          branch: "master",
          files: [{ path: "README.md", content: "# hi" }],
          commitMessage: "test",
          confirmDirectPushToMain: false
        }),
      /Direct push to master requires confirmDirectPushToMain=true/i
    );
  } finally {
    if (previousToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previousToken;
  }
});

test("pushFilesDirectlyToBranch refuses without GitHub credentials", async () => {
  const previousToken = process.env.GITHUB_TOKEN;
  const previousAppId = process.env.GITHUB_APP_ID;
  const previousAppKey = process.env.GITHUB_APP_PRIVATE_KEY;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_APP_ID;
  delete process.env.GITHUB_APP_PRIVATE_KEY;

  try {
    const { pushFilesDirectlyToBranch } = await import("../src/lib/workspace/github-direct-push.ts");

    await assert.rejects(
      () =>
        pushFilesDirectlyToBranch({
          remoteUrl: "https://github.com/example/demo.git",
          branch: "feature/safe",
          files: [{ path: "README.md", content: "# hi" }],
          commitMessage: "test",
          confirmDirectPushToMain: false
        }),
      /GitHub credentials required/i
    );
  } finally {
    if (previousToken !== undefined) process.env.GITHUB_TOKEN = previousToken;
    if (previousAppId !== undefined) process.env.GITHUB_APP_ID = previousAppId;
    if (previousAppKey !== undefined) process.env.GITHUB_APP_PRIVATE_KEY = previousAppKey;
  }
});

test("pushFilesDirectlyToBranch refuses invalid GitHub URL", async () => {
  const previousToken = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = "ghp_test_token_for_unit";

  try {
    const { pushFilesDirectlyToBranch } = await import("../src/lib/workspace/github-direct-push.ts");

    await assert.rejects(
      () =>
        pushFilesDirectlyToBranch({
          remoteUrl: "not-a-github-url",
          branch: "feature/safe",
          files: [{ path: "README.md", content: "# hi" }],
          commitMessage: "test",
          confirmDirectPushToMain: false
        }),
      /Invalid GitHub URL/i
    );
  } finally {
    if (previousToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previousToken;
  }
});
