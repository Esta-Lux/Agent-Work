import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

export interface SandboxExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class SandboxRuntime {
  constructor(private readonly hostVolumePath: string) {}

  public async executeCommand(command: string[]): Promise<SandboxExecutionResult> {
    const [program, ...args] = command;

    return new Promise((resolve) => {
      const child = spawn(program, args, {
        cwd: this.hostVolumePath,
        stdio: ["ignore", "pipe", "pipe"]
      });
      let stdout = "";
      let stderr = "";
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        resolve({
          exitCode: 124,
          stdout,
          stderr: stderr || "Command timed out after 30 seconds."
        });
      }, 30_000);

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        clearTimeout(timeout);
        resolve({
          exitCode: 127,
          stdout,
          stderr: error.message
        });
      });

      child.on("close", (exitCode) => {
        clearTimeout(timeout);
        resolve({
          exitCode: exitCode ?? 1,
          stdout,
          stderr
        });
      });
    });
  }

  public writeFile(relativeFilePath: string, content: string): void {
    const safePath = normalize(relativeFilePath).replace(/^(\.\.(\/|\\|$))+/, "");
    const absolutePath = join(this.hostVolumePath, safePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content, "utf8");
  }
}

