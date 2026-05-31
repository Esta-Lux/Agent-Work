import { buildProductBrain } from "@/lib/product-brain/product-brain-builder";
import { buildProductBrainContext as toProductBrainContext } from "@/lib/product-brain/product-brain-context";
import { getProductBrain, upsertProductBrain } from "@/lib/product-brain/product-brain-store";
import type { ProductBrain, ProductBrainContext } from "@/lib/product-brain/product-brain-types";
import type { ProjectBrief } from "@/lib/workspace/workspace-types";

export function queryProductBrain(input: {
  projectId: string;
  brief?: Partial<ProjectBrief>;
  files?: Array<{ path: string; content: string }>;
  correction?: string;
}): ProductBrain {
  const previous = getProductBrain(input.projectId);
  const brain = buildProductBrain({
    projectId: input.projectId,
    brief: input.brief,
    files: input.files,
    previous,
    correction: input.correction
  });
  return upsertProductBrain(brain);
}

export function buildProductBrainContext(brain: ProductBrain | null): ProductBrainContext | undefined {
  return toProductBrainContext(brain);
}
