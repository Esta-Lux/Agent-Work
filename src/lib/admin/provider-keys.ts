export type ProviderKeyId =
  | "nvidia"
  | "openai"
  | "github_token"
  | "github_app"
  | "self_repo_remote";

export interface ProviderKeyStatus {
  id: ProviderKeyId;
  present: boolean;
  masked: string | null;
  envVar: string;
  hint: string;
}

interface ProviderKeyDef {
  id: ProviderKeyId;
  envVar: string;
  hint: string;
}

const KEY_DEFINITIONS: ProviderKeyDef[] = [
  {
    id: "nvidia",
    envVar: "NVIDIA_API_KEY",
    hint: "Required to call BootRise / NVIDIA Nemotron models from the admin self-agent."
  },
  {
    id: "openai",
    envVar: "OPENAI_API_KEY",
    hint: "Required for OpenAI fallback provider routing."
  },
  {
    id: "github_token",
    envVar: "GITHUB_TOKEN",
    hint: "Personal access token used for GitHub push / draft PR flows."
  },
  {
    id: "github_app",
    envVar: "GITHUB_APP_PRIVATE_KEY",
    hint: "GitHub App private key for installation-based pushes (alternative to GITHUB_TOKEN)."
  },
  {
    id: "self_repo_remote",
    envVar: "BOOTRISE_SELF_REPO_REMOTE_URL",
    hint: "Optional override for the self-repo remote URL used by GitHub direct push."
  }
];

function maskValue(value: string): string {
  const last4 = value.slice(-4);
  return `****${last4}`;
}

export function getProviderKeysStatus(): ProviderKeyStatus[] {
  return KEY_DEFINITIONS.map((def) => {
    const raw = process.env[def.envVar];
    const present = Boolean(raw && raw.length > 0);
    return {
      id: def.id,
      present,
      masked: present ? maskValue(raw as string) : null,
      envVar: def.envVar,
      hint: def.hint
    };
  });
}

export function getEnvSetupSnippet(missing: ProviderKeyStatus[]): string {
  if (missing.length === 0) {
    return "# All provider keys are configured.";
  }
  const lines = ["# Add the following to .env.local (never commit real values):"];
  for (const entry of missing) {
    lines.push(`${entry.envVar}=<paste-key-here>`);
  }
  return lines.join("\n");
}
