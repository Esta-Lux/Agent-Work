export interface ProductRoadmapItem {
  id: string;
  title: string;
  status: "planned" | "in_progress" | "blocked" | "done";
  notes?: string;
}

export interface ProductDecision {
  id: string;
  summary: string;
  rationale?: string;
  decidedAt: string;
}

export interface ProductFailure {
  id: string;
  summary: string;
  cause?: string;
  recordedAt: string;
}

export interface ProductBrain {
  projectId: string;
  productName: string;
  oneLineDescription: string;
  targetUsers: string[];
  primaryWorkflows: string[];
  businessModel?: string;
  userRoles: string[];
  policies: string[];
  nonNegotiables: string[];
  currentRoadmap: ProductRoadmapItem[];
  knownRisks: string[];
  previousDecisions: ProductDecision[];
  previousFailures: ProductFailure[];
  definitionOfDone: string[];
  updatedAt: string;
}

export interface ProductBrainContext {
  summary: string;
  policies: string[];
  definitionOfDone: string[];
  knownRisks: string[];
}
