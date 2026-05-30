import { buildEnvVarMap } from "@/lib/project-brain/env-var-map";
import { buildImportGraph } from "@/lib/project-brain/import-graph";
import { buildRouteMap } from "@/lib/project-brain/route-map";
import { buildFileSymbolIndex, type FileSymbolIndex } from "@/lib/project-brain/symbol-indexer";
import { buildTestMap } from "@/lib/project-brain/test-map";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export interface ProjectBrainV2 {
  repositoryId: string;
  builtAt: string;
  totalFiles: number;
  indexedFiles: number;
  staleFiles: number;
  symbolIndex: FileSymbolIndex[];
  importGraph: ReturnType<typeof buildImportGraph>;
  routeMap: ReturnType<typeof buildRouteMap>;
  envVarMap: ReturnType<typeof buildEnvVarMap>;
  testMap: ReturnType<typeof buildTestMap>;
  summary: {
    totalApiRoutes: number;
    authGuardedRoutes: number;
    unguardedRoutes: string[];
    totalComponents: number;
    totalDatabaseTables: string[];
    envVarsReferenced: string[];
    missingEnvDocs: string[];
  };
}

export function buildProjectBrainV2(input: {
  repositoryId: string;
  files: SourceFileInput[];
  envExampleContent?: string;
}): ProjectBrainV2 {
  const paths = input.files.map((file) => file.path);
  const symbolIndex = input.files.map((file) => buildFileSymbolIndex(file, paths));
  const importGraph = buildImportGraph(symbolIndex);
  const routeMap = buildRouteMap(symbolIndex);
  const envVarMap = buildEnvVarMap(symbolIndex, input.envExampleContent ?? findEnvExample(input.files));
  const testMap = buildTestMap(paths);
  const databaseTables = [...new Set(symbolIndex.flatMap((file) => file.databaseRefs))];
  const envVars = envVarMap.envVars.map((env) => env.name);

  return {
    repositoryId: input.repositoryId,
    builtAt: new Date().toISOString(),
    totalFiles: input.files.length,
    indexedFiles: symbolIndex.length,
    staleFiles: 0,
    symbolIndex,
    importGraph,
    routeMap,
    envVarMap,
    testMap,
    summary: {
      totalApiRoutes: routeMap.routes.length,
      authGuardedRoutes: routeMap.routes.filter((route) => route.authGuarded).length,
      unguardedRoutes: routeMap.routes.filter((route) => !route.authGuarded).map((route) => route.file),
      totalComponents: symbolIndex.reduce((count, file) => count + file.components.length, 0),
      totalDatabaseTables: databaseTables,
      envVarsReferenced: envVars,
      missingEnvDocs: envVarMap.envVars.filter((env) => !env.documented).map((env) => env.name)
    }
  };
}

function findEnvExample(files: SourceFileInput[]): string {
  return files.find((file) => /\.env\.example$/i.test(file.path))?.content ?? "";
}
