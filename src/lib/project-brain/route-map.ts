import type { FileSymbolIndex } from "@/lib/project-brain/symbol-indexer";

export interface RouteMap {
  routes: Array<{ path: string; methods: string[]; file: string; authGuarded: boolean }>;
}

export function buildRouteMap(index: FileSymbolIndex[]): RouteMap {
  return {
    routes: index
      .filter((file) => file.path.includes("/api/") && file.path.endsWith("route.ts"))
      .map((file) => ({
        path: file.path.replace(/^src\/app/, "").replace(/\/route\.ts$/, "") || "/",
        methods: file.apiRoutes.length ? file.apiRoutes : ["GET"],
        file: file.path,
        authGuarded: file.authUsage.length > 0
      }))
  };
}
