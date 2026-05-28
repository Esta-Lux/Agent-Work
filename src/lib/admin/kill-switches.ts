import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface KillSwitchState {
  disableNvidia: boolean;
  disableOpenAI: boolean;
  disableClaude: boolean;
  disableCodex: boolean;
  disableFixExecution: boolean;
  disableSandbox: boolean;
  disableExpensiveModels: boolean;
  disablePremiumEscalation: boolean;
  disableGithubImport: boolean;
  disableGithubPush: boolean;
  disableDraftPrCreation: boolean;
  disableAdminChat: boolean;
  disableAdminAgent: boolean;
  disableAdvancedAdminAgent: boolean;
  disableAgentToolUse: boolean;
  disableAgentShell: boolean;
  disableDetectionsScanner: boolean;
  disableDetectionsWatchdog: boolean;
  maxWorkspaceFiles: number;
  updatedAt: string;
  updatedBy: string;
}

const DEFAULT_STATE: KillSwitchState = {
  disableNvidia: false,
  disableOpenAI: false,
  disableClaude: true,
  disableCodex: true,
  disableFixExecution: false,
  disableSandbox: false,
  disableExpensiveModels: false,
  disablePremiumEscalation: false,
  disableGithubImport: false,
  disableGithubPush: false,
  disableDraftPrCreation: false,
  disableAdminChat: false,
  disableAdminAgent: false,
  disableAdvancedAdminAgent: false,
  disableAgentToolUse: false,
  disableAgentShell: false,
  disableDetectionsScanner: true,
  disableDetectionsWatchdog: false,
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

export function assertKillSwitchAllowed(
  action:
    | "nvidia"
    | "openai"
    | "claude"
    | "codex"
    | "fix"
    | "sandbox"
    | "expensive_model"
    | "premium_escalation"
    | "github_import"
    | "github_push"
    | "draft_pr"
    | "admin_chat"
    | "admin_agent"
    | "advanced_admin_agent"
    | "agent_tool_use"
    | "agent_shell"
    | "detections_scanner"
    | "detections_watchdog"
): void {
  const state = getKillSwitches();
  if (action === "nvidia" && state.disableNvidia) {
    throw new Error("BootRise AI / NVIDIA is disabled by admin kill switch.");
  }
  if (action === "openai" && state.disableOpenAI) {
    throw new Error("OpenAI is disabled by admin kill switch.");
  }
  if (action === "claude" && state.disableClaude) {
    throw new Error("Claude is disabled by admin kill switch.");
  }
  if (action === "codex" && state.disableCodex) {
    throw new Error("Codex is disabled by admin kill switch.");
  }
  if (action === "fix" && state.disableFixExecution) {
    throw new Error("Fix execution is disabled by admin kill switch.");
  }
  if (action === "sandbox" && state.disableSandbox) {
    throw new Error("Sandbox verification is disabled by admin kill switch.");
  }
  if (action === "expensive_model" && state.disableExpensiveModels) {
    throw new Error("Expensive AI models are disabled by admin kill switch. Use a lighter workflow or contact admin.");
  }
  if (action === "premium_escalation" && state.disablePremiumEscalation) {
    throw new Error("Premium model escalation is disabled by admin kill switch.");
  }
  if (action === "github_import" && state.disableGithubImport) {
    throw new Error("GitHub import is disabled by admin kill switch.");
  }
  if (action === "github_push" && state.disableGithubPush) {
    throw new Error("GitHub push is disabled by admin kill switch.");
  }
  if (action === "draft_pr" && state.disableDraftPrCreation) {
    throw new Error("Draft PR creation is disabled by admin kill switch.");
  }
  if (action === "admin_chat" && state.disableAdminChat) {
    throw new Error("Admin chat is disabled by admin kill switch.");
  }
  if (action === "admin_agent" && state.disableAdminAgent) {
    throw new Error("Admin self-agent is disabled by admin kill switch.");
  }
  if (action === "advanced_admin_agent" && state.disableAdvancedAdminAgent) {
    throw new Error("Advanced admin agent (multi-agent graph) is disabled by admin kill switch.");
  }
  if (action === "agent_tool_use" && state.disableAgentToolUse) {
    throw new Error("Admin agent tool use is disabled by admin kill switch.");
  }
  if (action === "agent_shell" && state.disableAgentShell) {
    throw new Error("Admin agent shell tools are disabled by admin kill switch.");
  }
  if (action === "detections_scanner" && state.disableDetectionsScanner) {
    throw new Error("Detections scanner is disabled by admin kill switch.");
  }
  if (action === "detections_watchdog" && state.disableDetectionsWatchdog) {
    throw new Error("Detections watchdog is disabled by admin kill switch.");
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
