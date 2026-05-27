import type { FileScanContext } from "@/lib/security/scan-context";
import {
  containsLikelySecretValue,
  isDocumentationPath,
  isEnvExampleOrTemplate,
  mentionsSecretConfigOnly
} from "@/lib/security/scan-path-utils";

export function scanSecrets({ files, add }: FileScanContext): void {
  for (const { path, content } of files) {
    if (isEnvExampleOrTemplate(path)) {
      if (containsLikelySecretValue(content)) {
        add({
          severity: "high",
          category: "secret",
          file: path,
          title: "Example env file contains value-shaped secret",
          whyItMatters: "Even example files should use placeholders, not real keys.",
          evidence: content.slice(0, 120),
          recommendedFix: "Replace with empty or REPLACE_ME placeholders.",
          blocksDeployment: true,
          autoFixAvailable: false
        });
      }
      continue;
    }

    if (isDocumentationPath(path) && !containsLikelySecretValue(content)) {
      continue;
    }

    if (containsLikelySecretValue(content)) {
      add({
        severity: "critical",
        category: "secret",
        file: path,
        title: "Possible exposed secret",
        whyItMatters: "Secrets in source can leak via repos and client bundles.",
        evidence: content.slice(0, 120),
        recommendedFix: "Move to environment variables and rotate the key.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
      continue;
    }

    if (mentionsSecretConfigOnly(content) && /\.(py|ts|tsx|js|jsx|mjs)$/i.test(path)) {
      const isPlaceholder =
        /=\s*['"]?\s*['"]?\s*$|=\s*['"]?(?:xxx|your_|replace|changeme|<)/im.test(content) ||
        /os\.environ|getenv|process\.env/i.test(content);
      if (!isPlaceholder && /['"][^'"]{12,}['"]/.test(content)) {
        add({
          severity: "critical",
          category: "secret",
          file: path,
          title: "Hardcoded credential pattern",
          whyItMatters: "Long literal values next to secret env names often leak real keys.",
          evidence: content.slice(0, 120),
          recommendedFix: "Load from environment only; rotate if this was ever committed.",
          blocksDeployment: true,
          autoFixAvailable: false
        });
      }
    }
  }
}
