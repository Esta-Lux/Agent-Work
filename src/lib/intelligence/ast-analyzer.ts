import ts from "typescript";
import type { DependencyEdge, SymbolRecord } from "@/lib/types/core";

export interface AstAnalysisResult {
  symbols: SymbolRecord[];
  dependencies: DependencyEdge[];
}

export function analyzeTypeScriptAst(filePath: string, source: string): AstAnalysisResult {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, inferScriptKind(filePath));
  const symbols: SymbolRecord[] = [];
  const dependencies: DependencyEdge[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const target = node.moduleSpecifier.text;
      dependencies.push({
        from: filePath,
        to: target,
        kind: target.startsWith(".") || target.startsWith("@/") ? "import" : "package"
      });
    }

    const symbol = extractSymbol(filePath, node);
    if (symbol) {
      symbols.push(symbol);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  if (isRouteFile(filePath)) {
    symbols.push({
      name: routeNameFromPath(filePath),
      kind: "route",
      filePath,
      exported: true
    });
  }

  return {
    symbols: dedupeSymbols(symbols),
    dependencies
  };
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

