import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export type DevPreviewStatus = "disabled" | "installing" | "starting" | "ready" | "failed" | "static_only";

export interface DevPreviewSession {
  id: string;
  status: DevPreviewStatus;
  port: number | null;
  proxyUrl: string;
  staticUrl: string;
  framework: string;
  cwd: string | null;
  log: string[];
  error?: string;
  updatedAt: string;
}

const DEV_ROOT = resolve(process.cwd(), ".bootrise", "preview-dev");
const processes = new Map<string, ChildProcess>();
const sessions = new Map<string, DevPreviewSession>();

function devEnabled(): boolean {
  const flag = process.env.BOOTRISE_PREVIEW_DEV?.trim();
  return flag !== "0" && flag !== "false";
}

function sessionMetaPath(id: string) {
  return join(DEV_ROOT, `${id}.json`);
}

function persistSession(session: DevPreviewSession) {
  mkdirSync(DEV_ROOT, { recursive: true });
  writeFileSync(sessionMetaPath(session.id), JSON.stringify(session), "utf8");
}

export function getDevPreviewSession(id: string): DevPreviewSession | null {
  if (sessions.has(id)) return sessions.get(id)!;
  const path = sessionMetaPath(id);
  if (!existsSync(path)) return null;
  try {
    const session = JSON.parse(readFileSync(path, "utf8")) as DevPreviewSession;
    sessions.set(id, session);
    return session;
  } catch {
    return null;
  }
}

export function getDevPreviewProxyUrl(sessionId: string): string {
  return `/api/workspace/preview/proxy/${sessionId}/`;
}

interface DevTarget {
  label: string;
  cwd: string;
  framework: string;
  installArgs: string[];
  devArgs: string[];
}

export function detectDevTarget(files: SourceFileInput[]): DevTarget | null {
  const paths = new Set(files.map((f) => f.path));

  const candidates: Array<{ prefix: string; label: string; framework: string; devScript: string }> = [
    { prefix: "app/frontend/", label: "Frontend", framework: "Vite / React", devScript: "dev" },
    { prefix: "app/mobile/", label: "Mobile", framework: "Expo", devScript: "start" },
    { prefix: "", label: "Root", framework: "Next.js", devScript: "dev" }
  ];

  for (const c of candidates) {
    const pkgPath = `${c.prefix}package.json`;
    if (!paths.has(pkgPath)) continue;

    const hasLock =
      paths.has(`${c.prefix}package-lock.json`) ||
      paths.has(`${c.prefix}pnpm-lock.yaml`) ||
      paths.has(`${c.prefix}yarn.lock`);

    const installArgs = hasLock
      ? ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]
      : ["npm", "install", "--ignore-scripts", "--no-audit", "--no-fund", "--legacy-peer-deps"];

    const devArgs =
      c.devScript === "dev"
        ? ["npm", "run", "dev", "--", "--host", "127.0.0.1"]
        : ["npm", "run", c.devScript];

    return {
      label: c.label,
      cwd: c.prefix || ".",
      framework: c.framework,
      installArgs,
      devArgs
    };
  }

  return null;
}

function pickPort(seed: string): number {
  let hash = 45100;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * 17) % 400;
  return 45100 + hash;
}

function appendLog(session: DevPreviewSession, line: string) {
  session.log = [...session.log.slice(-80), line];
  session.updatedAt = new Date().toISOString();
}

function stopProcess(id: string) {
  const proc = processes.get(id);
  if (proc && !proc.killed) {
    proc.kill("SIGTERM");
  }
  processes.delete(id);
}

export async function startDevPreview(input: {
  sessionId: string;
  previewRoot: string;
  files: SourceFileInput[];
}): Promise<DevPreviewSession> {
  const proxyUrl = getDevPreviewProxyUrl(input.sessionId);
  const staticUrl = `/api/workspace/preview/serve/${input.sessionId}/`;

  const base: DevPreviewSession = {
    id: input.sessionId,
    status: "static_only",
    port: null,
    proxyUrl,
    staticUrl,
    framework: "Static",
    cwd: null,
    log: [],
    updatedAt: new Date().toISOString()
  };

  if (!devEnabled()) {
    base.status = "disabled";
    base.log = ["Dev preview disabled (BOOTRISE_PREVIEW_DEV=0). Using static staged files."];
    sessions.set(input.sessionId, base);
    persistSession(base);
    return base;
  }

  const target = detectDevTarget(input.files);
  if (!target) {
    base.log = ["No package.json found in workspace — static preview only."];
    sessions.set(input.sessionId, base);
    persistSession(base);
    return base;
  }

  stopProcess(input.sessionId);

  const port = pickPort(input.sessionId + target.cwd);
  const devArgs = target.framework.includes("Expo")
    ? target.devArgs
    : [...target.devArgs, "--", "--host", "127.0.0.1", "--port", String(port)];
  const session: DevPreviewSession = {
    ...base,
    status: "installing",
    port,
    framework: target.framework,
    cwd: target.cwd,
    log: [`Target: ${target.label} (${target.cwd})`, `Port: ${port}`]
  };
  sessions.set(input.sessionId, session);
  persistSession(session);

  const cwd = join(input.previewRoot, target.cwd);
  if (!existsSync(join(cwd, "package.json"))) {
    session.status = "failed";
    session.error = `Missing package.json at ${target.cwd}`;
    persistSession(session);
    return session;
  }

  void runDevPipeline(input.sessionId, cwd, { ...target, devArgs }, session, port);
  return session;
}

async function runDevPipeline(
  sessionId: string,
  cwd: string,
  target: DevTarget,
  session: DevPreviewSession,
  port: number
) {
  const installTimeout = Number(process.env.BOOTRISE_PREVIEW_INSTALL_MS ?? "300000");
  const install = await runShell(target.installArgs, cwd, installTimeout);
  appendLog(session, `install: exit ${install.exitCode}`);
  if (install.output) appendLog(session, install.output.slice(-400));

  if (install.exitCode !== 0) {
    session.status = "failed";
    session.error = "npm install failed in preview sandbox.";
    persistSession(session);
    return;
  }

  session.status = "starting";
  persistSession(session);

  const devProc = spawn(target.devArgs[0], target.devArgs.slice(1), {
    cwd,
    env: { ...process.env, PORT: String(port), BROWSER: "none" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  processes.set(sessionId, devProc);

  const readyDeadline = Date.now() + 90_000;
  devProc.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    appendLog(session, text.trim().slice(0, 200));
    if (/localhost:\d+|127\.0\.0\.1:\d+|ready in/i.test(text) && session.status !== "ready") {
      session.status = "ready";
      persistSession(session);
    }
  });

  devProc.stderr?.on("data", (chunk: Buffer) => {
    appendLog(session, chunk.toString().trim().slice(0, 200));
  });

  devProc.on("close", (code) => {
    if (session.status === "ready") return;
    session.status = "failed";
    session.error = `Dev server exited (${code ?? "unknown"}).`;
    persistSession(session);
    processes.delete(sessionId);
  });

  while (Date.now() < readyDeadline) {
    const current = getDevPreviewSession(sessionId)?.status ?? session.status;
    if (current === "ready") return;
    const probe = await probePort(port);
    if (probe) {
      session.status = "ready";
      appendLog(session, `Dev server ready on port ${port}`);
      persistSession(session);
      return;
    }
    await sleep(1500);
  }

  const finalStatus = getDevPreviewSession(sessionId)?.status ?? session.status;
  if (finalStatus !== "ready") {
    session.status = "failed";
    session.error = "Dev server did not become ready in time. Static preview still available.";
    persistSession(session);
  }
}

async function probePort(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

function runShell(command: string[], cwd: string, timeoutMs: number): Promise<{ exitCode: number; output: string }> {
  return new Promise((resolve) => {
    const [program, ...args] = command;
    const child = spawn(program, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ exitCode: 124, output: output || "Timed out." });
    }, timeoutMs);

    child.stdout.on("data", (c: Buffer) => {
      output += c.toString();
    });
    child.stderr.on("data", (c: Buffer) => {
      output += c.toString();
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1, output });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ exitCode: 127, output: err.message });
    });
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function stopDevPreview(sessionId: string) {
  stopProcess(sessionId);
  const session = getDevPreviewSession(sessionId);
  if (session) {
    session.status = "static_only";
    session.port = null;
    persistSession(session);
  }
}
