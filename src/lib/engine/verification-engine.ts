import type { SandboxRuntime } from "@/lib/engine/sandbox-runtime";

export interface VerificationReport {
  isValid: boolean;
  brokenStage?: "COMPILE" | "TEST" | "API_CONTRACT";
  logs: string;
}

export class VerificationEngine {
  constructor(private readonly runtime: SandboxRuntime) {}

  public async runFullVerification(): Promise<VerificationReport> {
    const buildCheck = await this.runtime.executeCommand(["npm", "run", "build"]);
    if (buildCheck.exitCode !== 0) {
      return {
        isValid: false,
        brokenStage: "COMPILE",
        logs: buildCheck.stdout + buildCheck.stderr
      };
    }

    const testCheck = await this.runtime.executeCommand(["npm", "test"]);
    if (testCheck.exitCode !== 0) {
      return {
        isValid: false,
        brokenStage: "TEST",
        logs: testCheck.stdout + testCheck.stderr
      };
    }

    return {
      isValid: true,
      logs: buildCheck.stdout + testCheck.stdout || "System verified successfully. Code transitions are clean."
    };
  }
}

