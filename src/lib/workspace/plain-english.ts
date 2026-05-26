import {
  BOOTRISE_PLAIN_ENGLISH_SYSTEM,
  buildNarrativeParagraph,
  formatBootriseOpening,
  sanitizeUserFacingText
} from "@/lib/ai/bootrise-voice";
import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export { BOOTRISE_PLAIN_ENGLISH_SYSTEM as PLAIN_ENGLISH_SYSTEM };

export function buildPlainEnglishFromReport(report: WorkspaceFixReport): string {
  const previewOnly =
    report.approvalStatus !== "approved" && report.fixed.some((f) => f.path.startsWith("generated/"));
  const patchCount = report.patches?.length ?? report.fixed.length;

  const context =
    report.approvalStatus === "pending_approval"
      ? formatBootriseOpening(
          `It prepared ${patchCount} proposed change(s) to real paths in your workspace. Your live files are unchanged until you approve — this is BootRise's controlled execution gate.`
        )
      : report.approvalStatus === "approved"
        ? formatBootriseOpening(
            `It applied ${patchCount} approved patch(es) to your workspace snapshot. Architectural memory and verification now reflect this new state.`
          )
        : report.approvalStatus === "rejected"
          ? formatBootriseOpening("The last plan was rejected, so no files were modified. You can refine the request and run Fix again.")
          : previewOnly
            ? formatBootriseOpening(
                "This run produced preview-only paths. Refine your request with specific files so BootRise can target your imported repository."
              )
            : formatBootriseOpening("It analyzed your imported architecture and produced a change plan.");

  const finding = buildNarrativeParagraph({
    context: "",
    finding: `The interpreted goal is: ${simplify(report.plan.intent.interpretedGoal)}. Risk is ${report.plan.risk.level} — ${riskExplain(report.plan.risk.level)}.`,
    safety:
      report.safeToPr?.label != null
        ? `Safe to PR assessment: ${report.safeToPr.label}. ${report.safeToPr.reasons[0] ?? ""}`
        : "Run sandbox verify after approval for build proof.",
    next: ""
  });

  const bullets: string[] = [];
  if (report.howFixed.length > 0) {
    for (const step of report.howFixed.slice(0, 4)) {
      bullets.push(`• ${simplify(step.replace(/^[^:]+:\s*/, ""))}`);
    }
  } else {
    bullets.push("• Review the diff report, then approve or reject the plan.");
  }

  if (report.potentiallyBroken.length > 0) {
    bullets.push("", "Areas to retest after changes:");
    for (const item of report.potentiallyBroken.slice(0, 4)) {
      if (["high", "medium", "low"].includes(item)) continue;
      bullets.push(`• ${simplify(item)}`);
    }
  }

  bullets.push("", "Next: approve one focused plan, open Verify preview, run sandbox, then export or push to GitHub.");

  return sanitizeUserFacingText([context, "", finding, "", ...bullets].join("\n"));
}

export function buildPlainEnglishPrompt(technicalText: string): string {
  return `Rewrite the following BootRise engineering output for a founder (BootRise voice — architectural awareness, safety, clear English):\n\n${technicalText.slice(0, 6000)}`;
}

function simplify(text: string): string {
  return text
    .replace(/SecurityHeadersMiddleware/gi, "security headers on API responses")
    .replace(/blast radius/gi, "downstream impact across related modules")
    .replace(/scaffold/gi, "preview draft")
    .trim();
}

function riskExplain(level: string): string {
  if (level === "high") return "ship only after thorough device and CI testing";
  if (level === "medium") return "reasonable to ship after targeted regression tests";
  return "typically safe once sandbox checks pass";
}
