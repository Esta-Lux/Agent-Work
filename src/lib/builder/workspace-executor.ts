import { mkdirSync, writeFileSync } from "node:fs";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { basename, dirname, join, normalize, relative, resolve } from "node:path";
import type { BuilderRun, GeneratedProjectFile } from "@/lib/builder/app-builder";

export interface BuilderExecutionRequest {
  run: BuilderRun;
  approved: boolean;
}

export interface BuilderExecutionLog {
  stage: "approval" | "write" | "verify" | "repair" | "github";
  status: "pass" | "fail" | "skipped";
  message: string;
}

export interface BuilderExecutionResult {
  id: string;
  workspacePath: string;
  changedFiles: string[];
  logs: BuilderExecutionLog[];
  verification: Array<{ name: string; status: "pass" | "fail" | "skipped"; evidence: string }>;
  repairAttempts: Array<{ attempt: number; status: "pass" | "skipped"; evidence: string }>;
  preview: {
    mode: "workspace";
    url: string | null;
    instructions: string[];
  };
  githubPr: {
    status: "ready-for-approval" | "blocked";
    reason: string;
  };
}

const workspaceRoot = resolve(process.cwd(), ".bootrise", "builds");

export async function executeBuilderRun({ run, approved }: BuilderExecutionRequest): Promise<BuilderExecutionResult> {
  const id = `exec_${Date.now()}`;
  const workspacePath = resolve(workspaceRoot, `${safeSegment(run.blueprint.templateId)}-${run.id}`);
  const logs: BuilderExecutionLog[] = [];

  if (!approved) {
    return {
      id,
      workspacePath,
      changedFiles: [],
      logs: [{ stage: "approval", status: "fail", message: "Execution requires explicit approval." }],
      verification: [{ name: "Human approval", status: "fail", evidence: "approved=false" }],
      repairAttempts: [],
      preview: createPreview(null),
      githubPr: { status: "blocked", reason: "Approve the plan before writing project files." }
    };
  }

  mkdirSync(workspacePath, { recursive: true });
  logs.push({ stage: "approval", status: "pass", message: "Approved bounded file writer execution." });

  const changedFiles = writeApprovedFiles(workspacePath, run.files, logs);
  const verification = await verifyWorkspace(workspacePath, run.files);
  const repairAttempts = createRepairAttempts(verification);
  const failed = verification.some((check) => check.status === "fail");

  logs.push({
    stage: "github",
    status: failed ? "skipped" : "pass",
    message: failed ? "GitHub PR blocked until verification is clean." : "Workspace is ready for the GitHub PR approval gate."
  });

  return {
    id,
    workspacePath,
    changedFiles,
    logs,
    verification,
    repairAttempts,
    preview: createPreview(workspacePath),
    githubPr: {
      status: failed ? "blocked" : "ready-for-approval",
      reason: failed ? "Fix failed verification checks before opening a PR." : "Open PR is still a human approval gate."
    }
  };
}

function writeApprovedFiles(workspacePath: string, files: GeneratedProjectFile[], logs: BuilderExecutionLog[]): string[] {
  const changedFiles: string[] = [];

  for (const file of files) {
    const safePath = normalize(file.path).replace(/^(\.\.(\/|\\|$))+/, "");
    const absolutePath = resolve(workspacePath, safePath);
    if (!absolutePath.startsWith(workspacePath)) {
      logs.push({ stage: "write", status: "fail", message: `Blocked unsafe path: ${file.path}` });
      continue;
    }

    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, file.content, "utf8");
    changedFiles.push(relative(workspacePath, absolutePath));
    logs.push({ stage: "write", status: "pass", message: `${file.action} ${file.path}` });
  }

  return changedFiles;
}

async function verifyWorkspace(workspacePath: string, files: GeneratedProjectFile[]) {
  const checks: BuilderExecutionResult["verification"] = [];

  checks.push(await checkFile(workspacePath, "package.json", "Project manifest"));
  checks.push(await checkFile(workspacePath, "app/layout.tsx", "Root layout"));
  checks.push(await checkFile(workspacePath, "app/page.tsx", "Home page"));
  checks.push(await checkFile(workspacePath, "app/api/health/route.ts", "API health route"));
  checks.push(await checkFile(workspacePath, "tests/routes.spec.ts", "Route smoke tests"));

  const unsafeFile = files.find((file) => normalize(file.path).startsWith(".."));
  checks.push({
    name: "Path boundary",
    status: unsafeFile ? "fail" : "pass",
    evidence: unsafeFile ? `Unsafe file path found: ${unsafeFile.path}` : "All writes stayed inside the BootRise workspace."
  });

  checks.push(await checkText(workspacePath, "db/migrations/0001_initial.sql", "RLS migration", "enable row level security", true));
  checks.push(await checkText(workspacePath, "lib/model-router.ts", "Model router", "tier", false));
  checks.push(await checkText(workspacePath, "lib/repo-memory-index.ts", "Repo memory index", "Retrieve only the 3-10 files", false));

  const appRoutes = await countRoutes(join(workspacePath, "app"));
  checks.push({
    name: "Route inventory",
    status: appRoutes > 0 ? "pass" : "fail",
    evidence: `${appRoutes} app route/page files discovered.`
  });

  checks.push({
    name: "Sandbox commands",
    status: "skipped",
    evidence: "Generated project is written. npm install/dev/build execution is gated until sandbox runtime is approved."
  });

  checks.push({
    name: "GitHub PR",
    status: "skipped",
    evidence: "PR creation is intentionally blocked behind the send-PR human approval gate."
  });

  return checks;
}

async function checkFile(workspacePath: string, path: string, name: string) {
  try {
    await access(join(workspacePath, path));
    return { name, status: "pass" as const, evidence: `${path} exists.` };
  } catch {
    return { name, status: "fail" as const, evidence: `${path} is missing.` };
  }
}

async function checkText(workspacePath: string, path: string, name: string, text: string, skipWhenMissing: boolean) {
  try {
    const content = await readFile(join(workspacePath, path), "utf8");
    return {
      name,
      status: content.includes(text) ? "pass" as const : "fail" as const,
      evidence: content.includes(text) ? `${path} contains required guardrails.` : `${path} is missing ${text}.`
    };
  } catch {
    return {
      name,
      status: skipWhenMissing ? "skipped" as const : "fail" as const,
      evidence: skipWhenMissing ? `${path} was not required for this build.` : `${path} is missing.`
    };
  }
}

async function countRoutes(directory: string): Promise<number> {
  try {
    const entries = await readdir(directory);
    const counts = await Promise.all(
      entries.map(async (entry) => {
        const path = join(directory, entry);
        const info = await stat(path);
        if (info.isDirectory()) return countRoutes(path);
        return basename(path) === "page.tsx" || basename(path) === "route.ts" ? 1 : 0;
      })
    );
    return counts.reduce((sum, count) => sum + count, 0);
  } catch {
    return 0;
  }
}

function createRepairAttempts(verification: BuilderExecutionResult["verification"]) {
  const failures = verification.filter((check) => check.status === "fail");
  if (!failures.length) {
    return [{ attempt: 1, status: "skipped" as const, evidence: "No repair needed. Static workspace verification is clean." }];
  }

  return failures.slice(0, 3).map((failure, index) => ({
    attempt: index + 1,
    status: "skipped" as const,
    evidence: `Patch-only repair queued for ${failure.name}: ${failure.evidence}`
  }));
}

function createPreview(workspacePath: string | null) {
  return {
    mode: "workspace" as const,
    url: null,
    instructions: workspacePath
      ? [
          `cd ${workspacePath}`,
          "npm install",
          "npm run dev",
          "Open the local Next.js URL for browser preview and route checks."
        ]
      : []
  };
}

function safeSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "") || "build";
}
