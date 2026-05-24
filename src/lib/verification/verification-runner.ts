import { spawn } from "node:child_process";
import type { VerificationCheck } from "@/lib/types/core";

export interface VerificationRunResult {
  checks: VerificationCheck[];
  output: string[];
}

const runnableCommands = new Set(["npm run typecheck", "npm run build", "npm run lint", "npm test"]);

export async function runVerificationChecks(checks: VerificationCheck[]): Promise<VerificationRunResult> {
  const output: string[] = [];
  const results: VerificationCheck[] = [];

  for (const check of checks) {
    if (!check.command) {
      results.push({
        ...check,
        status: "skipped",
        notes: "No command is configured yet. This check needs a route/API/browser adapter."
      });
      continue;
    }

    if (!runnableCommands.has(check.command)) {
      results.push({
        ...check,
        status: "skipped",
        notes: "Command is not on the allowed verification list."
      });
      continue;
    }

    const result = await runCommand(check.command);
    output.push(`${check.command}: ${result.summary}`);
    results.push({
      ...check,
      status: result.exitCode === 0 ? "passed" : "failed",
      notes: result.summary
    });
  }

  return {
    checks: results,
    output
  };
}

function runCommand(command: string): Promise<{ exitCode: number; summary: string }> {
  const [program, ...args] = command.split(" ");

  return new Promise((resolve) => {
    const child = spawn(program, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"]
    });

    let combinedOutput = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        exitCode: 124,
        summary: "Timed out after 20 seconds."
      });
    }, 20_000);

    child.stdout.on("data", (chunk: Buffer) => {
      combinedOutput += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      combinedOutput += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
        exitCode: 127,
        summary: error.message
      });
    });

    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      resolve({
        exitCode: exitCode ?? 1,
        summary: combinedOutput.trim().slice(0, 1200) || `Exited with code ${exitCode ?? 1}.`
      });
    });
  });
}

