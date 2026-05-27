/** Shared Monaco language id from file path (editor + diff). */
export function languageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    py: "python",
    json: "json",
    md: "markdown",
    css: "css",
    scss: "scss",
    html: "html",
    yaml: "yaml",
    yml: "yaml",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    rs: "rust",
    go: "go",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    rb: "ruby",
    php: "php",
    xml: "xml",
    toml: "toml",
    dockerfile: "dockerfile"
  };
  if (filePath.toLowerCase().endsWith("dockerfile")) return "dockerfile";
  return map[ext] ?? "plaintext";
}
