import type { ProductBrain, ProductBrainContext } from "@/lib/product-brain/product-brain-types";

export function buildProductBrainContext(brain: ProductBrain | null): ProductBrainContext | undefined {
  if (!brain) return undefined;
  return {
    summary: `${brain.productName}: ${brain.oneLineDescription}`,
    policies: brain.policies.slice(0, 8),
    definitionOfDone: brain.definitionOfDone.slice(0, 8),
    knownRisks: brain.knownRisks.slice(0, 8)
  };
}
