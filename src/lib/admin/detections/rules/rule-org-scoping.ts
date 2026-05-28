import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { analyzeTypeScriptAst } from "@/lib/intelligence/ast-analyzer";
import type { DetectionDraft } from "@/lib/admin/detections/types";

const PATH_PREFIX = "src/lib/workspace/";
const STATE_NEEDLES = [/readFileSync\b/, /writeFileSync\b/, /appendFileSync\b/, /upsertRecord\b/, /memoryStore\./];
const ORG_NEEDLES = [/\borgId\b/, /\bDEFAULT_ORG_ID\b/];

export function ruleOrgScoping(input: { files: SourceFileInput[] }): DetectionDraft[] {
  const out: DetectionDraft[] = [];
  for (const file of input.files) {
    if (!file.path.startsWith(PATH_PREFIX)) continue;
    if (!/\.(ts|tsx)$/.test(file.path)) continue;
    if (!STATE_NEEDLES.some((re) => re.test(file.content))) continue;
    if (ORG_NEEDLES.some((re) => re.test(file.content))) continue;
    const analysis = analyzeTypeScriptAst(file.path, file.content);
    const exportedSymbol = analysis.symbols.find((s) => s.exported)?.name ?? "(unknown)";
    out.push({
      kind: "org_scoping_missing",
      severity: "warning",
      title: `Workspace helper missing orgId scoping`,
      description: `${file.path} touches shared state but does not reference orgId/DEFAULT_ORG_ID.`,
      affectedPaths: [file.path],
      evidence: { path: file.path, symbol: exportedSymbol },
      suggestedAction: "Thread orgId through the helper and partition state per tenant.",
      suggestedFixRequest: `Thread orgId through ${exportedSymbol} in ${file.path} so tenant state is isolated.`,
      source: "scanner"
    });
  }
  return out;
}
