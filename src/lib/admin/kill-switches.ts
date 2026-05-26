import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface KillSwitchState {
  disableFixExecution: boolean;
  disableSandbox: boolean;
  disableExpensiveModels: boolean;
  disableGithubPush: boolean;
  maxWorkspaceFiles: number;
  updatedAt: string;
  updatedBy: string;
}

const DEFAULT_STATE: KillSwitchState = {
  disableFixExecution: false,
  disableSandbox: false,
  disableExpensiveModels: false,
  disableGithubPush: false,
  maxWorkspaceFiles: 5000,
  updatedAt: new Date().toISOString(),
  updatedBy: "system"
};

const storePath = resolve(process.cwd(), ".bootrise", "admin", "kill-switches.json");

function ensureDir() {
  mkdirSync(join(storePath, ".."), { recursive: true });
}

export function getKillSwitches(): KillSwitchState {
  ensureDir();
  if (!existsSync(storePath)) {
    writeFileSync(storePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { ...DEFAULT_STATE };
  }
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(readFileSync(storePath, "utf8")) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function updateKillSwitches(patch: Partial<KillSwitchState>, updatedBy = "admin"): KillSwitchState {
  const next: KillSwitchState = {
    ...getKillSwitches(),
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy
  };
  ensureDir();
  writeFileSync(storePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function assertKillSwitchAllowed(action: "fix" | "sandbox" | "expensive_model" | "github_push"): void {
  const state = getKillSwitches();
  if (action === "fix" && state.disableFixExecution) {
    throw new Error("Fix execution is disabled by admin kill switch.");
  }
  if (action === "sandbox" && state.disableSandbox) {
    throw new Error("Sandbox verification is disabled by admin kill switch.");
  }
  if (action === "expensive_model" && state.disableExpensiveModels) {
    throw new Error("Expensive AI models are disabled by admin kill switch. Use a lighter workflow or contact admin.");
  }
  if (action === "github_push" && state.disableGithubPush) {
    throw new Error("GitHub push is disabled by admin kill switch.");
  }
}

export function assertWorkspaceFileLimit(fileCount: number): void {
  const state = getKillSwitches();
  if (fileCount > state.maxWorkspaceFiles) {
    throw new Error(
      `Workspace exceeds admin file limit (${fileCount} > ${state.maxWorkspaceFiles}). Reduce import scope or ask admin to raise the cap.`
    );
  }
}
