import type { RepoIntelligenceSnapshot, RiskLevel } from "@/lib/types/core";

export interface RepoHealthSignal {
  id: string;
  label: string;
  value: string;
  level: RiskLevel;
  detail: string;
}

export interface RepoHealthSummary {
  score: number;
  signals: RepoHealthSignal[];
  recommendations: string[];
}

export function createRepoHealthSummary(repo: RepoIntelligenceSnapshot): RepoHealthSummary {
  const sourceFiles = repo.files.filter((file) => file.role === "source");
  const testFiles = repo.files.filter((file) => file.role === "test");
  const schemaFiles = repo.files.filter((file) => file.role === "schema");
  const packageEdges = repo.dependencies.filter((edge) => edge.kind === "package");
  const internalEdges = repo.dependencies.filter((edge) => edge.kind === "import");
  const testRatio = sourceFiles.length === 0 ? 0 : testFiles.length / sourceFiles.length;
  const couplingRatio = sourceFiles.length === 0 ? 0 : internalEdges.length / sourceFiles.length;
  const score = Math.max(
    42,
    Math.min(
      96,
      78 +
        Math.round(testRatio * 12) -
        Math.max(0, Math.round((couplingRatio - 2) * 5)) -
        Math.max(0, schemaFiles.length - 2)
    )
  );

  return {
    score,
    signals: [
      {
        id: "coverage-proxy",
        label: "Test Surface",
        value: testFiles.length === 0 ? "Missing" : `${Math.round(testRatio * 100)}%`,
        level: testFiles.length === 0 ? "medium" : "low",
        detail: "Estimated from discovered test files versus source files."
      },
      {
        id: "coupling",
        label: "Module Coupling",
        value: couplingRatio > 2 ? "Elevated" : "Normal",
        level: couplingRatio > 2 ? "medium" : "low",
        detail: `${internalEdges.length} internal dependency edges across ${sourceFiles.length} source files.`
      },
      {
        id: "schema-risk",
        label: "Schema Risk",
        value: schemaFiles.length > 0 ? "Present" : "None",
        level: schemaFiles.length > 0 ? "medium" : "low",
        detail: `${schemaFiles.length} schema-adjacent files discovered.`
      },
      {
        id: "external-deps",
        label: "External Packages",
        value: String(packageEdges.length),
        level: packageEdges.length > 8 ? "medium" : "low",
        detail: "Package imports that should be checked during dependency updates."
      }
    ],
    recommendations: [
      "Add real route smoke checks for changed App Router paths.",
      "Persist architecture memory before approving auth, billing, or schema changes.",
      "Store validation evidence with every approved execution.",
      "Upgrade lightweight symbol parsing to compiler-backed AST extraction."
    ]
  };
}

