import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";

const { loadGithubAuthConfig, githubAuthStatus, hasGithubApiCredentials } = await import(
  "../src/lib/github/github-config.ts"
);

const envBackup = { ...process.env };

describe("github config", () => {
  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("reports not ready without credentials", () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_APP_CLIENT_ID;
    delete process.env.GITHUB_APP_ID;
    const status = githubAuthStatus(loadGithubAuthConfig());
    assert.equal(status.ready, false);
    assert.equal(hasGithubApiCredentials(loadGithubAuthConfig()), false);
  });

  it("reports app client configured without exposing secret", () => {
    process.env.GITHUB_APP_CLIENT_ID = "Ov23test";
    process.env.GITHUB_APP_CLIENT_SECRET = "secret_value";
    const status = githubAuthStatus(loadGithubAuthConfig());
    assert.equal(status.app?.clientId, "Ov23test");
    assert.equal(status.app?.hasClientSecret, true);
    assert.equal(status.ready, false);
  });

  it("ready with PAT", () => {
    process.env.GITHUB_TOKEN = "ghp_test";
    assert.equal(hasGithubApiCredentials(loadGithubAuthConfig()), true);
  });
});
