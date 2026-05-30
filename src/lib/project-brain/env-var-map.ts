import type { FileSymbolIndex } from "@/lib/project-brain/symbol-indexer";

export interface EnvVarMap {
  envVars: Array<{ name: string; files: string[]; documented: boolean }>;
}

export function buildEnvVarMap(index: FileSymbolIndex[], envExampleContent = ""): EnvVarMap {
  const byName = new Map<string, Set<string>>();
  for (const file of index) {
    for (const env of file.envVarRefs) {
      byName.set(env, new Set([...(byName.get(env) ?? []), file.path]));
    }
  }
  return {
    envVars: [...byName.entries()].map(([name, files]) => ({
      name,
      files: [...files],
      documented: envExampleContent.includes(name)
    }))
  };
}
