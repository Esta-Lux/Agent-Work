import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { analyzeTypeScriptAst } from "@/lib/intelligence/ast-analyzer";
import type { DetectionDraft } from "@/lib/admin/detections/types";

const ROUTE_REGEX = /^src\/app\/api\/workspace\/.+\/route\.tsx?$/;
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function ruleAuditLog(input: { files: SourceFileInput[] }): DetectionDraft[] {
  const out: DetectionDraft[] = [];
  for (const file of input.files) {
    if (!ROUTE_REGEX.test(file.path)) continue;
    const analysis = analyzeTypeScriptAst(file.path, file.content);
    const mutatingExports = analysis.symbols.filter((sym) => sym.exported && MUTATING.has(sym.name));
    if (mutatingExports.length === 0) continue;
    if (file.content.includes("recordAudit")) continue;
    out.push({
      kind: "audit_log_missing",
      severity: "warning",
      title: `Workspace route handles mutations without audit log`,
      description: `${file.path} exports ${mutatingExports.map((s) => s.name).join("/")} but never calls recordAudit.`,
      affectedPaths: [file.path],
      evidence: { route: file.path, methods: mutatingExports.map((s) => s.name).join(",") },
      suggestedAction: "Call recordAudit after the mutation completes.",
      suggestedFixRequest: `Add recordAudit(...) call to mutating handlers in ${file.path}.`,
      source: "scanner"
    });
  }
  return out;
}
