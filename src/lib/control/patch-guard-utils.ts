export function matchesPattern(path: string, pattern: string): boolean {
  const regexParts = pattern.split("/").map((segment) => {
    if (segment === "**") return ".*";
    let out = "";
    for (const char of segment) {
      if (char === "*") out += "[^/]*";
      else out += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
    return out;
  });
  return new RegExp(`^${regexParts.join("/")}$`, "i").test(path);
}

export function isFormatOnlyChange(before: string, after: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, "").trim();
  return norm(before) === norm(after) && before !== after;
}
