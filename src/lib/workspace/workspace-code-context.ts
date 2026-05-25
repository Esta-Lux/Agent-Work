export interface LoadedFileSnippet {
  path: string;
  content: string;
}

const REVIEW_KEYWORDS: Array<{ terms: string[]; pathHints: string[] }> = [
  {
    terms: ["turn card", "turn-card", "maneuver", "instruction card", "then in"],
    pathHints: [
      "turncard",
      "turninstruction",
      "turn-card",
      "navhud",
      "mapscreen",
      "navdisplay",
      "sdkguidance",
      "banner",
      "app/mobile",
      "navigation/"
    ]
  },
  {
    terms: ["hud", "heads-up", "navigation ui", "navigating", "while driving", "eta strip"],
    pathHints: ["mapscreen", "navhud", "turninstruction", "navigationdebug", "etastrip", "fab", "recenter"]
  },
  {
    terms: ["snaproad", "what is", "about this app", "product"],
    pathHints: ["readme", "agents.md", "package.json", "app.json"]
  },
  {
    terms: ["map", "mapbox", "route", "reroute"],
    pathHints: ["mapscreen", "mapbox", "navigation", "directions", "route"]
  }
];

export function isProductCodeReviewQuestion(message: string): boolean {
  const n = message.toLowerCase();
  if (n.includes("what can you do") || n.includes("export bundle")) return false;
  return (
    n.includes("review") ||
    n.includes("turn card") ||
    n.includes("hud") ||
    n.includes("navigat") ||
    n.includes("snaproad") ||
    n.includes("what is") ||
    n.includes("how does") ||
    n.includes("ux") ||
    n.includes("driver") ||
    n.includes("map screen")
  );
}

export function selectRelevantFiles(message: string, files: LoadedFileSnippet[], maxFiles = 24): LoadedFileSnippet[] {
  const n = message.toLowerCase();
  const scores = new Map<string, number>();

  for (const file of files) {
    const pathLower = file.path.toLowerCase();
    let score = 0;
    if (pathLower.includes("readme")) score += 3;
    if (pathLower.includes("agents.md")) score += 2;

    for (const group of REVIEW_KEYWORDS) {
      if (group.terms.some((t) => n.includes(t))) {
        for (const hint of group.pathHints) {
          if (pathLower.includes(hint)) score += 5;
        }
      }
    }

    for (const token of n.split(/\W+/).filter((t) => t.length > 3)) {
      if (pathLower.includes(token)) score += 2;
    }

    if (score > 0) scores.set(file.path, score);
  }

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([path]) => files.find((f) => f.path === path)!)
    .filter(Boolean);

  if (ranked.length >= 3) return ranked.slice(0, maxFiles);

  const fallbackHints = ["readme", "agents", "mapscreen", "turn", "navigation", "main.py", "package.json"];
  const fallback = files.filter((f) => fallbackHints.some((h) => f.path.toLowerCase().includes(h)));
  return [...new Map([...ranked, ...fallback].map((f) => [f.path, f])).values()].slice(0, maxFiles);
}

export function buildCodeContextBlock(files: LoadedFileSnippet[], maxCharsPerFile = 6000): string {
  const parts: string[] = [];
  let total = 0;
  const budget = 48_000;

  for (const file of files) {
    const chunk = file.content.length > maxCharsPerFile ? `${file.content.slice(0, maxCharsPerFile)}\n…(truncated)` : file.content;
    const block = `### ${file.path}\n\`\`\`\n${chunk}\n\`\`\``;
    if (total + block.length > budget) break;
    parts.push(block);
    total += block.length;
  }

  return parts.join("\n\n");
}

export function buildCodeReviewSystemPrompt(productName?: string): string {
  return [
    "You are BootRise, a senior mobile + backend engineer reviewing a real codebase.",
    productName ? `Product: ${productName}` : "",
    "Answer the user's exact question using ONLY the file excerpts provided.",
    "If files for navigation UI are missing, say what you need imported (e.g. app/mobile MapScreen, TurnInstructionCard) — do not invent a generic security audit.",
    "Structure your reply:",
    "## Answer",
    "(direct response)",
    "## Suggested next steps",
    "(2-4 concrete actions in the real repo)",
    "Use clear language throughout. Do not add a separate Plain English section.",
    "Do not repeat an unrelated previous fix report."
  ]
    .filter(Boolean)
    .join("\n");
}
