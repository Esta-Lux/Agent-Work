import ts from "typescript";
import type { DependencyEdge, SymbolRecord } from "@/lib/types/core";

export interface SymbolDependency {
  symbolName: string;
  filePath: string;
  dependencies: string[];
}

export interface AstAnalysisResult {
  symbols: SymbolRecord[];
  dependencies: DependencyEdge[];
  symbolDependencies: SymbolDependency[];
  callEdges: DependencyEdge[];
}

export function analyzeTypeScriptAst(filePath: string, source: string): AstAnalysisResult {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, inferScriptKind(filePath));
  const symbols: SymbolRecord[] = [];
  const dependencies: DependencyEdge[] = [];
  const callEdges: DependencyEdge[] = [];
  const importBindings = new Map<string, string>();
  const localSymbols = new Set<string>();
  const symbolBodies = new Map<string, ts.Node>();

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const target = node.moduleSpecifier.text;
      dependencies.push({
        from: filePath,
        to: target,
        kind: target.startsWith(".") || target.startsWith("@/") ? "import" : "package"
      });

      if (node.importClause) {
        if (node.importClause.name) {
          importBindings.set(node.importClause.name.text, target);
        }
        if (node.importClause.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            for (const element of node.importClause.namedBindings.elements) {
              const local = element.name.text;
              importBindings.set(local, target);
            }
          } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            importBindings.set(node.importClause.namedBindings.name.text, target);
          }
        }
      }
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const target = node.moduleSpecifier.text;
      dependencies.push({
        from: filePath,
        to: target,
        kind: target.startsWith(".") || target.startsWith("@/") ? "import" : "package"
      });

      if (node.exportClause) {
        if (ts.isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            const exportName = (element.name ?? element.propertyName)?.text;
            if (!exportName) continue;
            symbols.push({
              name: exportName,
              kind: "function",
              filePath,
              exported: true
            });
            localSymbols.add(exportName);
          }
        }
      } else {
        symbols.push({
          name: `*:${target}`,
          kind: "function",
          filePath,
          exported: true
        });
      }
    }

    const symbol = extractSymbol(filePath, node);
    if (symbol) {
      symbols.push(symbol);
      localSymbols.add(symbol.name);
      symbolBodies.set(symbol.name, node);
    }

    if (ts.isCallExpression(node)) {
      const callee = calleeName(node.expression);
      if (callee) {
        callEdges.push({ from: filePath, to: callee, kind: "runtime" });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  if (isRouteFile(filePath)) {
    const routeName = routeNameFromPath(filePath);
    symbols.push({
      name: routeName,
      kind: "route",
      filePath,
      exported: true
    });
    localSymbols.add(routeName);
  }

  const dedupedSymbols = dedupeSymbols(symbols);
  const symbolDependencies = buildSymbolDependencies(
    filePath,
    dedupedSymbols,
    symbolBodies,
    importBindings,
    localSymbols
  );

  return {
    symbols: dedupedSymbols,
    dependencies,
    symbolDependencies,
    callEdges
  };
}

function buildSymbolDependencies(
  filePath: string,
  symbols: SymbolRecord[],
  symbolBodies: Map<string, ts.Node>,
  importBindings: Map<string, string>,
  localSymbols: Set<string>
): SymbolDependency[] {
  return symbols.map((symbol) => {
    const deps = new Set<string>();
    const body = symbolBodies.get(symbol.name);

    if (body) {
      collectIdentifierDeps(body, deps, importBindings, localSymbols);
      collectCallDeps(body, deps, localSymbols);
    }

    if (symbol.name.startsWith("*:")) {
      const modulePath = symbol.name.slice(2);
      deps.add(modulePath);
    }

    return {
      symbolName: symbol.name,
      filePath,
      dependencies: Array.from(deps).filter((dep) => dep !== symbol.name)
    };
  });
}

function collectIdentifierDeps(
  node: ts.Node,
  deps: Set<string>,
  importBindings: Map<string, string>,
  localSymbols: Set<string>
): void {
  const visit = (child: ts.Node) => {
    if (ts.isIdentifier(child)) {
      const name = child.text;
      if (importBindings.has(name)) {
        deps.add(name);
      } else if (localSymbols.has(name)) {
        deps.add(name);
      }
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
}

function collectCallDeps(node: ts.Node, deps: Set<string>, localSymbols: Set<string>): void {
  const visit = (child: ts.Node) => {
    if (ts.isCallExpression(child)) {
      const callee = calleeName(child.expression);
      if (callee && localSymbols.has(callee)) {
        deps.add(callee);
      }
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
}

function calleeName(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
}

function inferScriptKind(filePath: string): ts.ScriptKind {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (filePath.endsWith(".js")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function extractSymbol(filePath: string, node: ts.Node): SymbolRecord | null {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return {
      name: node.name.text,
      kind: inferFunctionKind(filePath, node.name.text),
      filePath,
      exported: hasExportModifier(node)
    };
  }

  if (ts.isClassDeclaration(node) && node.name) {
    return {
      name: node.name.text,
      kind: "class",
      filePath,
      exported: hasExportModifier(node)
    };
  }

  if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
    return {
      name: node.name.text,
      kind: "type",
      filePath,
      exported: hasExportModifier(node)
    };
  }

  if (ts.isVariableStatement(node)) {
    const declaration = node.declarationList.declarations[0];
    if (declaration && ts.isIdentifier(declaration.name)) {
      return {
        name: declaration.name.text,
        kind: inferVariableKind(filePath, declaration.name.text),
        filePath,
        exported: hasExportModifier(node)
      };
    }
  }

  if (ts.isExportAssignment(node)) {
    const name = "default";
    if (ts.isIdentifier(node.expression)) {
      return {
        name: node.expression.text,
        kind: inferFunctionKind(filePath, node.expression.text),
        filePath,
        exported: true
      };
    }
    return {
      name,
      kind: inferFunctionKind(filePath, name),
      filePath,
      exported: true
    };
  }

  return null;
}

function inferFunctionKind(filePath: string, name: string): SymbolRecord["kind"] {
  if (name.startsWith("use")) return "hook";
  if (name === "action" || name.endsWith("Action")) return "server-action";
  if (isRouteFile(filePath)) return "route";
  if (/^[A-Z]/.test(name)) return "component";
  return "function";
}

function inferVariableKind(filePath: string, name: string): SymbolRecord["kind"] {
  if (name.startsWith("use")) return "hook";
  if (name.includes("schema") || filePath.includes("schema")) return "schema";
  if (/^[A-Z]/.test(name)) return "component";
  return "constant";
}

function hasExportModifier(node: ts.Node): boolean {
  return Boolean(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function isRouteFile(filePath: string): boolean {
  return /\/route\.(ts|tsx|js|jsx)$/.test(filePath);
}

function routeNameFromPath(filePath: string): string {
  return filePath.replace(/^src\/app\//, "/").replace(/\/route\.(ts|tsx|js|jsx)$/, "");
}

function dedupeSymbols(symbols: SymbolRecord[]): SymbolRecord[] {
  const seen = new Set<string>();

  return symbols.filter((symbol) => {
    const key = `${symbol.filePath}:${symbol.kind}:${symbol.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
