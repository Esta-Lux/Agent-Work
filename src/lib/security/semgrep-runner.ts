import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { SecurityFinding } from "@/lib/security/types";

interface SemgrepJsonResult {
  results?: Array<{
    check_id?: string;
    path?: string;
    extra?: {
      severity?: string;
      message?: string;
      lines?: string;
      metadata?: { category?: string };
    };
  }>;
}

function semgrepEnabled(): boolean {
  if (process.env.BOOTRISE_SEMGREP === "0" || process.env.BOOTRISE_SEMGREP === "false") return false;
  return process.env.BOOTRISE_SEMGREP === "1" || process.env.BOOTRISE_SEMGREP === "true" || Boolean(process.env.BOOTRISE_SEMGREP_AUTO);
}

function mapSeverity(raw?: string): SecurityFinding["severity"] {
  const s = (raw ?? "WARNING").toUpperCase();
  if (s === "ERROR" || s === "CRITICAL") return "critical";
  if (s === "HIGH") return "high";
  if (s === "MEDIUM" || s === "WARNING") return "medium";
  return "low";
}

function mapCategory(checkId: string): SecurityFinding["category"] {
  const id = checkId.toLowerCase();
  if (/secret|password|api-key|credential/.test(id)) return "secret";
  if (/auth|jwt|session|oauth/.test(id)) return "auth";
  if (/sql|injection|xss|csrf/.test(id)) return "api";
  if (/stripe|payment|billing/.test(id)) return "payment";
  if (/rls|supabase|database/.test(id)) return "database";
  if (/deploy|docker|k8s|terraform/.test(id)) return "deployment";
  if (/depend|supply|npm|pypi/.test(id)) return "dependency";
  return "api";
}

export function isSemgrepAvailable(): boolean {
  if (!semgrepEnabled()) return false;
  const probe = spawnSync("semgrep", ["--version"], { encoding: "utf8", timeout: 8_000 });
  return probe.status === 0;
}

export function runSemgrepScan(files: SourceFileInput[]): {
  findings: SecurityFinding[];
  ran: boolean;
  skippedReason?: string;
} {
  if (!semgrepEnabled()) {
    return { findings: [], ran: false, skippedReason: "Semgrep disabled (set BOOTRISE_SEMGREP=1 to enable)" };
  }
  if (!isSemgrepAvailable()) {
    return {
      findings: [],
      ran: false,
      skippedReason: "semgrep CLI not installed — brew install semgrep or pip install semgrep"
    };
  }

  const scanDir = fs.mkdtempSync(path.join(os.tmpdir(), "bootrise-semgrep-"));
  try {
    for (const file of files.slice(0, 400)) {
      const safe = file.path.replace(/\.\./g, "").replace(/^\/+/, "");
      const dest = path.join(scanDir, safe);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, file.content, "utf8");
    }

    const config = process.env.BOOTRISE_SEMGREP_CONFIG?.trim() || "auto";
    const args = ["scan", "--quiet", "--json", "--config", config, scanDir];
    const result = spawnSync("semgrep", args, {
      encoding: "utf8",
      maxBuffer: 12 * 1024 * 1024,
      timeout: Number(process.env.BOOTRISE_SEMGREP_TIMEOUT_MS ?? "120000")
    });

    if (result.error) {
      const timedOut = result.error.message.includes("ETIMEDOUT");
      return {
        findings: [],
        ran: false,
        skippedReason: timedOut ? "Semgrep scan timed out" : result.error.message
      };
    }

    const stdout = result.stdout?.trim() || "{}";
    let parsed: SemgrepJsonResult = {};
    try {
      parsed = JSON.parse(stdout) as SemgrepJsonResult;
    } catch {
      const detail = result.stderr?.trim().slice(0, 200) || "Semgrep returned non-JSON output";
      return { findings: [], ran: false, skippedReason: detail };
    }

    const findings: SecurityFinding[] = [];
    for (const row of parsed.results ?? []) {
      const checkId = row.check_id ?? "semgrep.rule";
      const relPath = row.path?.replace(scanDir, "").replace(/^\//, "") ?? undefined;
      const severity = mapSeverity(row.extra?.severity);
      findings.push({
        id: `semgrep:${checkId}:${relPath ?? "unknown"}`,
        severity,
        category: mapCategory(checkId),
        file: relPath,
        title: checkId.split(".").pop()?.replace(/-/g, " ") ?? "Semgrep finding",
        whyItMatters: row.extra?.message ?? "Static analysis flagged a pattern that may be unsafe in production.",
        evidence: row.extra?.lines,
        recommendedFix: "Review the flagged code path and fix or suppress with team approval.",
        blocksDeployment: severity === "critical" || severity === "high",
        autoFixAvailable: false
      });
    }

    return { findings, ran: true };
  } finally {
    try {
      fs.rmSync(scanDir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
}
