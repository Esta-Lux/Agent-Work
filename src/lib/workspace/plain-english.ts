import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

const PLAIN_ENGLISH_SYSTEM = `You are BootRise's product translator. Rewrite technical engineering content for a non-technical founder.
Rules:
- Use short sentences and everyday words (no jargon like "blast radius", "middleware", "scaffold" unless you explain them).
- Say what the product IS, what was found, what could improve the user experience, and what to do next.
- Do not invent features or files not mentioned in the input.
- Max 8 bullet points.`;

export function buildPlainEnglishFromReport(report: WorkspaceFixReport): string {
  const previewOnly = report.fixed.some((f) => f.path.startsWith("generated/"));
  const lines = [
    previewOnly
      ? "BootRise prepared a preview plan only — your real project files were not changed yet."
      : "BootRise analyzed your project and suggested changes.",
    "",
    `Goal: ${simplify(report.plan.intent.interpretedGoal)}`,
    `Risk level: ${report.plan.risk.level} — ${riskExplain(report.plan.risk.level)}`,
    "",
    "What this means for your product:"
  ];

  if (report.howFixed.length > 0) {
    for (const step of report.howFixed.slice(0, 6)) {
      lines.push(`• ${simplify(step.replace(/^[^:]+:\s*/, ""))}`);
    }
  } else {
    lines.push("• Review the suggested steps before changing live code.");
  }

  if (report.potentiallyBroken.length > 0) {
    lines.push("", "Areas to retest after changes:");
    for (const item of report.potentiallyBroken.slice(0, 5)) {
      if (item === "high" || item === "medium" || item === "low") continue;
      lines.push(`• ${simplify(item)}`);
    }
  }

  lines.push("", "Next step: pick one change, approve it, then apply it in your repo and test on a real device.");
  return lines.join("\n");
}

export function buildPlainEnglishPrompt(technicalText: string): string {
  return `Translate the following BootRise output for a non-technical founder:\n\n${technicalText.slice(0, 6000)}`;
}

export { PLAIN_ENGLISH_SYSTEM };

function simplify(text: string): string {
  return text
    .replace(/SecurityHeadersMiddleware/gi, "security headers on API responses")
    .replace(/blast radius/gi, "other parts of the app that might be affected")
    .replace(/scaffold/gi, "preview draft")
    .trim();
}

function riskExplain(level: string): string {
  if (level === "high") return "take extra care; test thoroughly before users see it";
  if (level === "medium") return "reasonable to ship with testing";
  return "usually safe with basic checks";
}
