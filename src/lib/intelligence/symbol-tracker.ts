import type { SymbolRecord } from "@/lib/types/core";

export function extractLightweightSymbols(filePath: string, source: string): SymbolRecord[] {
  const records: SymbolRecord[] = [];
  const exportNames = new Set<string>();

  for (const match of source.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class|type|interface)\s+([A-Za-z0-9_]+)/g)) {
    exportNames.add(match[1]);
  }

  for (const match of source.matchAll(/(?:function|const|class|type|interface)\s+([A-Za-z0-9_]+)/g)) {
    const name = match[1];
    records.push({
      name,
      kind: inferSymbolKind(name, source.slice(Math.max(0, match.index - 40), match.index + 120)),
      filePath,
      exported: exportNames.has(name)
    });
  }

  return records;
}

function inferSymbolKind(name: string, context: string): SymbolRecord["kind"] {
  if (name.startsWith("use")) {
    return "hook";
  }

  if (/^[A-Z]/.test(name) && context.includes("=>")) {
    return "component";
  }

  if (context.includes("type ") || context.includes("interface ")) {
    return "type";
  }

  if (context.includes("class ")) {
    return "class";
  }

  if (context.includes("const ")) {
    return "constant";
  }

  return "function";
}

