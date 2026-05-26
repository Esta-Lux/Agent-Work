import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { listLedgerEvents, type LedgerEvent } from "@/lib/workspace/living-ledger-timeline";

const RULE_FILE_PATTERNS = [
  /^agents\.md$/i,
  /^AGENTS\.md$/i,
  /^\.cursor\/rules\//i,
  /^\.cursorrules$/i,
  /^docs\/RULES\.md$/i,
  /^RULES\.md$/i,
  /^CONTRIBUTING\.md$/i
];

export interface InjectedContextRules {
  projectRules: Array<{ path: string; excerpt: string }>;
  ledgerDecisions: string[];
  combinedBlock: string;
  charEstimate: number;
}

export async function buildInjectedContextRules(input: {
  files: SourceFileInput[];
  projectId?: string;
  maxRuleChars?: number;
  maxLedgerItems?: number;
}): Promise<InjectedContextRules> {
  const maxRuleChars = input.maxRuleChars ?? 12_000;
  const maxLedgerItems = input.maxLedgerItems ?? 8;

  const projectRules: Array<{ path: string; excerpt: string }> = [];
  let used = 0;

  for (const file of input.files) {
    if (!RULE_FILE_PATTERNS.some((re) => re.test(file.path))) continue;
    const budget = maxRuleChars - used;
    if (budget <= 200) break;
    const excerpt = file.content.length > budget ? `${file.content.slice(0, budget)}\n…` : file.content;
    projectRules.push({ path: file.path, excerpt });
    used += excerpt.length;
  }

  const ledgerDecisions: string[] = [];
  if (input.projectId?.trim()) {
    const events = await listLedgerEvents(input.projectId, maxLedgerItems);
    for (const event of events) {
      ledgerDecisions.push(formatLedgerLine(event));
    }
  }

  const blocks: string[] = [];
  if (projectRules.length > 0) {
    blocks.push(
      "## Project rules (must follow)",
      ...projectRules.map((r) => `### ${r.path}\n${r.excerpt}`)
    );
  }
  if (ledgerDecisions.length > 0) {
    blocks.push("## Prior workspace decisions", ...ledgerDecisions.map((l) => `- ${l}`));
  }

  const combinedBlock = blocks.join("\n\n");
  return {
    projectRules,
    ledgerDecisions,
    combinedBlock,
    charEstimate: combinedBlock.length
  };
}

function formatLedgerLine(event: LedgerEvent): string {
  return `[${event.kind}] ${event.title}: ${event.narrative.slice(0, 160)}`;
}
