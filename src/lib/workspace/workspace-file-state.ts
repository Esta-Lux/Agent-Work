export type WorkspaceFileStatus = "unchanged" | "modified" | "added" | "deleted";
export type WorkspaceFileSource = "github" | "manual" | "ai_patch";

export interface WorkspaceFileState {
  path: string;
  originalContent: string;
  currentContent: string;
  status: WorkspaceFileStatus;
  source: WorkspaceFileSource;
  riskLevel: "normal" | "high" | "critical";
  updatedAt: string;
}

export function createWorkspaceFileStates(files: Array<{ path: string; content: string }>): WorkspaceFileState[] {
  const now = new Date().toISOString();

  return files.map((file) => ({
    path: file.path,
    originalContent: file.content,
    currentContent: file.content,
    status: "unchanged",
    source: "github",
    riskLevel: inferRiskLevel(file.path),
    updatedAt: now
  }));
}

export function updateWorkspaceFile(
  files: WorkspaceFileState[],
  path: string,
  content: string,
  source: WorkspaceFileSource = "manual"
): WorkspaceFileState[] {
  const now = new Date().toISOString();
  let found = false;

  const next: WorkspaceFileState[] = files.map((file) => {
    if (file.path !== path) return file;
    found = true;

    const status: WorkspaceFileStatus = content === file.originalContent ? "unchanged" : "modified";

    return {
      ...file,
      currentContent: content,
      status,
      source,
      updatedAt: now
    };
  });

  if (found) return next;

  const addedFile: WorkspaceFileState = {
    path,
    originalContent: "",
    currentContent: content,
    status: "added",
    source,
    riskLevel: inferRiskLevel(path),
    updatedAt: now
  };

  return [
    ...next,
    addedFile
  ].sort((a, b) => a.path.localeCompare(b.path));
}

export function resetWorkspaceFile(files: WorkspaceFileState[], path: string): WorkspaceFileState[] {
  const now = new Date().toISOString();

  return files.map((file) => {
    if (file.path !== path) return file;

    return {
      ...file,
      currentContent: file.originalContent,
      status: "unchanged",
      source: "github",
      updatedAt: now
    };
  });
}

export function getChangedWorkspaceFiles(files: WorkspaceFileState[]): WorkspaceFileState[] {
  return files.filter((file) => file.status !== "unchanged");
}

export function toApiWorkspaceFiles(files: WorkspaceFileState[]): Array<{ path: string; content: string }> {
  return files
    .filter((file) => file.status !== "deleted")
    .map((file) => ({
      path: file.path,
      content: file.currentContent
    }));
}

function inferRiskLevel(path: string): "normal" | "high" | "critical" {
  const lower = path.toLowerCase();

  if (
    lower.includes(".env") ||
    lower.includes("auth") ||
    lower.includes("middleware") ||
    lower.includes("supabase") ||
    lower.includes("migration") ||
    lower.includes("stripe") ||
    lower.includes("billing")
  ) {
    return "critical";
  }

  if (
    lower.includes("api/") ||
    lower.includes("route.ts") ||
    lower.includes("model-router") ||
    lower.includes("github") ||
    lower.includes("admin")
  ) {
    return "high";
  }

  return "normal";
}
