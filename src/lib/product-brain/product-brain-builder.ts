import type { ProjectBrief } from "@/lib/workspace/workspace-types";
import type { ProductBrain } from "@/lib/product-brain/product-brain-types";

export function buildProductBrain(input: {
  projectId: string;
  brief?: Partial<ProjectBrief>;
  files?: Array<{ path: string; content: string }>;
  previous?: ProductBrain | null;
  correction?: string;
}): ProductBrain {
  const previous = input.previous;
  const brief = input.brief ?? {};
  const authRequired = Boolean(brief.authRequired);
  const paymentsRequired = Boolean(brief.paymentsRequired);
  const correction = input.correction?.trim();
  const roadmaps = previous?.currentRoadmap ?? [];
  const knownRisks = new Set(previous?.knownRisks ?? []);

  if (authRequired) knownRisks.add("Authentication boundaries must remain tenant-safe.");
  if (paymentsRequired) knownRisks.add("Billing changes require reconciliation and auditability.");
  if (containsPath(input.files, /middleware|auth|policy/i)) knownRisks.add("Auth middleware and policy files require high-risk review.");
  if (containsPath(input.files, /billing|credit|usage/i)) knownRisks.add("Usage and billing changes require regression checks.");
  if (correction) knownRisks.add(`User correction noted: ${correction}`);

  const definitionOfDone = [
    ...(previous?.definitionOfDone ?? []),
    "Core workflow passes regression checks.",
    "Security and deployment readiness checks are green before PR."
  ];

  return {
    projectId: input.projectId,
    productName: brief.productName?.trim() || previous?.productName || "BootRise project",
    oneLineDescription:
      correction ||
      brief.primaryWorkflow?.trim() ||
      previous?.oneLineDescription ||
      "AI-assisted product delivery workflow with scoped patch approval.",
    targetUsers: previous?.targetUsers?.length
      ? previous.targetUsers
      : [brief.audience?.trim() || "Product teams", "Engineering teams"],
    primaryWorkflows: mergeUnique(previous?.primaryWorkflows ?? [], [brief.primaryWorkflow?.trim() || "Ship scoped approved changes"]),
    businessModel: previous?.businessModel,
    userRoles: mergeUnique(previous?.userRoles ?? [], ["workspace-admin", "workspace-member"]),
    policies: mergeUnique(previous?.policies ?? [], [
      "No direct patch to protected branches.",
      "Control gate approval is required before apply/push."
    ]),
    nonNegotiables: mergeUnique(previous?.nonNegotiables ?? [], [
      "Preserve scope lock",
      "Preserve security and policy boundaries"
    ]),
    currentRoadmap: roadmaps,
    knownRisks: [...knownRisks],
    previousDecisions: previous?.previousDecisions ?? [],
    previousFailures: previous?.previousFailures ?? [],
    definitionOfDone: mergeUnique([], definitionOfDone),
    updatedAt: new Date().toISOString()
  };
}

function containsPath(files: Array<{ path: string; content: string }> | undefined, pattern: RegExp): boolean {
  return (files ?? []).some((file) => pattern.test(file.path));
}

function mergeUnique(current: string[], incoming: string[]): string[] {
  return [...new Set([...current, ...incoming.filter(Boolean)])];
}
