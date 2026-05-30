import { defineConfig } from "playwright/test";
import { adminAuthFile, workspaceAuthFile } from "./tests/e2e/support/auth";

const baseEnv = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: "1",
  BOOTRISE_E2E_AUTH: "1"
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  use: {
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: [
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      cwd: "/tmp/workspace/Esta-Lux/Agent-Work",
      reuseExistingServer: !process.env.CI,
      env: {
        ...baseEnv,
        BOOTRISE_DEV_AUTH_BYPASS: "1"
      }
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3101",
      url: "http://127.0.0.1:3101",
      cwd: "/tmp/workspace/Esta-Lux/Agent-Work",
      reuseExistingServer: !process.env.CI,
      env: {
        ...baseEnv,
        BOOTRISE_DEV_AUTH_STRICT: "1"
      }
    }
  ],
  projects: [
    {
      name: "workspace-bypass",
      testMatch: /workspace\.e2e\.spec\.ts/,
      use: {
        baseURL: "http://127.0.0.1:3100"
      }
    },
    {
      name: "workspace-strict",
      testMatch: /workspace\.e2e\.spec\.ts/,
      use: {
        baseURL: "http://127.0.0.1:3101",
        storageState: workspaceAuthFile
      }
    },
    {
      name: "admin-bypass",
      testMatch: /admin\.e2e\.spec\.ts/,
      use: {
        baseURL: "http://127.0.0.1:3100"
      }
    },
    {
      name: "admin-strict",
      testMatch: /admin\.e2e\.spec\.ts/,
      use: {
        baseURL: "http://127.0.0.1:3101",
        storageState: adminAuthFile
      }
    },
    {
      name: "auth-guest-strict",
      testMatch: /auth-guest\.e2e\.spec\.ts/,
      use: {
        baseURL: "http://127.0.0.1:3101"
      }
    },
    {
      name: "auth-workspace-strict",
      testMatch: /auth-workspace\.e2e\.spec\.ts/,
      use: {
        baseURL: "http://127.0.0.1:3101",
        storageState: workspaceAuthFile
      }
    }
  ]
});
