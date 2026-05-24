export type RiskLevel = "low" | "medium" | "high";

export type WorkerDomain = "frontend" | "backend" | "database" | "infra" | "tests";

export type VerificationKind =
  | "build"
  | "typecheck"
  | "test"
  | "route"
  | "api-contract"
  | "visual"
  | "performance";

export type VerificationStatus = "pending" | "passed" | "failed" | "skipped";

export interface RepoFile {
  path: string;
  language: string;
  sizeBytes: number;
  role: "source" | "test" | "config" | "schema" | "docs" | "unknown";
}

export interface SymbolRecord {
  name: string;
  kind: "function" | "component" | "hook" | "class" | "type" | "constant" | "route";
  filePath: string;
  exported: boolean;
}

export interface DependencyEdge {
  from: string;
  to: string;
  kind: "import" | "package" | "route" | "data" | "runtime";
}

export interface ArchitectureMemoryEntry {
  id: string;
  title: string;
  rationale: string;
  constraints: string[];
  createdAt: string;
}

export interface RepoIntelligenceSnapshot {
  generatedAt: string;
  files: RepoFile[];
  symbols: SymbolRecord[];
  dependencies: DependencyEdge[];
  architectureMemory: ArchitectureMemoryEntry[];
}

export interface ChangeIntent {
  request: string;
  interpretedGoal: string;
  businessImpact: string;
}

export interface ImpactAnalysis {
  files: string[];
  services: string[];
  apis: string[];
  databaseSchemas: string[];
  blastRadius: string[];
}

export interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
}

export interface ExecutionStep {
  id: string;
  title: string;
  domain: WorkerDomain;
  summary: string;
  targetFiles: string[];
  dependsOn: string[];
}

export interface VerificationCheck {
  id: string;
  kind: VerificationKind;
  title: string;
  command?: string;
  status: VerificationStatus;
  notes?: string;
}

export interface ChangePlan {
  id: string;
  intent: ChangeIntent;
  impact: ImpactAnalysis;
  risk: RiskAssessment;
  steps: ExecutionStep[];
  validations: VerificationCheck[];
  rollbackStrategy: string;
}

export interface ExecutionResult {
  planId: string;
  completedStepIds: string[];
  changedFiles: string[];
  notes: string[];
}

export interface ChangeReport {
  plan: ChangePlan;
  execution: ExecutionResult;
  verification: VerificationCheck[];
  summary: string;
  residualRisk: string[];
}

