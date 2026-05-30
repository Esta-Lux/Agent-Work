import type { FileSymbolIndex } from "@/lib/project-brain/symbol-indexer";

export function detectStaleFiles(previous: FileSymbolIndex[], next: FileSymbolIndex[]): string[] {
  const nextByPath = new Map(next.map((file) => [file.path, file.hash]));
  return previous.filter((file) => nextByPath.get(file.path) !== file.hash).map((file) => file.path);
}
