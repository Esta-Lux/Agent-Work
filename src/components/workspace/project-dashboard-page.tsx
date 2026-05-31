"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthHeaderActions } from "@/components/auth-gate";
import { createLaunchProjectSeed, buildWorkspaceProjectPath } from "@/lib/workspace/project-launch";

interface DashboardProject {
  id: string;
  name: string;
  githubUrl?: string | null;
  repositoryId?: string | null;
  updatedAt: string;
  files?: Array<{ path: string; content: string }>;
}

interface DashboardResponse {
  projects?: DashboardProject[];
  storage?: string;
  supabase?: { configured?: boolean; schemaReady?: boolean; message?: string };
  error?: string;
}

export function ProjectDashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [storage, setStorage] = useState<string | null>(null);
  const [supabaseMessage, setSupabaseMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<"blank" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshProjects();
  }, []);

  async function refreshProjects() {
    setLoading(true);
    try {
      const response = await fetch("/api/workspace/projects", { credentials: "include" });
      const data = (await response.json().catch(() => ({}))) as DashboardResponse;
      if (!response.ok) throw new Error(data.error ?? "Failed to load projects.");
      setProjects(data.projects ?? []);
      setStorage(data.storage ?? null);
      setSupabaseMessage(data.supabase?.message ?? null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  async function createProject(mode: "blank" | "import") {
    setCreating(mode);
    try {
      const seed = createLaunchProjectSeed(mode);
      const response = await fetch("/api/workspace/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...seed })
      });
      const data = (await response.json().catch(() => ({}))) as { project?: DashboardProject; error?: string };
      if (!response.ok || !data.project?.id) {
        throw new Error(data.error ?? "Project creation failed.");
      }
      router.push(buildWorkspaceProjectPath(data.project.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Project creation failed.");
      setCreating(null);
    }
  }

  return (
    <div className="min-h-screen bg-mesh-light text-ink">
      <header className="border-b border-line/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-signal">BootRise</p>
            <h1 className="mt-1 text-2xl font-semibold">Project dashboard</h1>
            <p className="mt-1 text-sm text-steel">Open a saved workspace or create a new project for repository import.</p>
          </div>
          <AuthHeaderActions />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="grid gap-4 rounded-3xl border border-line bg-white/90 p-6 shadow-card lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <p className="text-sm font-semibold text-graphite">Launch workspace</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">Start from a project, not a blank session.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-steel">
              BootRise closed beta now keeps project selection URL-addressable. Create a workspace, import a repo,
              and reopen the same project later from its dedicated route.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void createProject("blank")}
                disabled={creating !== null}
                className="rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-signal-bright disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating === "blank" ? "Creating…" : "Create project"}
              </button>
              <button
                type="button"
                onClick={() => void createProject("import")}
                disabled={creating !== null}
                className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-graphite transition hover:border-signal/40 hover:text-signal disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating === "import" ? "Preparing…" : "Import repo in workspace"}
              </button>
              <Link
                href="/"
                className="rounded-xl border border-line bg-cloud/50 px-4 py-2.5 text-sm font-semibold text-graphite transition hover:bg-cloud"
              >
                Open alpha workspace
              </Link>
            </div>
            {error ? <p className="mt-4 text-sm text-critical">{error}</p> : null}
          </div>

          <div className="rounded-2xl border border-line bg-cloud/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-steel">Persistence</p>
            <p className="mt-2 text-sm font-semibold text-ink">{storage ? `Storage mode: ${storage}` : "Checking storage…"}</p>
            <p className="mt-2 text-xs leading-5 text-steel">
              {supabaseMessage ?? "BootRise will use Supabase when configured and fall back to local project snapshots in development."}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Your projects</h2>
              <p className="text-sm text-steel">Open an existing workspace or create a new one for repo import.</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshProjects()}
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-graphite transition hover:bg-cloud"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-line bg-white/90 p-8 text-sm text-steel shadow-card">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white/90 p-8 shadow-card">
              <p className="text-base font-semibold text-ink">No projects yet</p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-steel">
                Create a project to get a stable workspace URL, then connect or import a repository from inside the project workspace.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={buildWorkspaceProjectPath(project.id)}
                  className="rounded-2xl border border-line bg-white/90 p-5 shadow-card transition hover:-translate-y-0.5 hover:border-signal/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{project.name}</p>
                      <p className="mt-1 text-xs text-steel">{project.files?.length ?? 0} files saved</p>
                    </div>
                    <span className="rounded-full bg-signal/10 px-2.5 py-1 text-[11px] font-semibold text-signal">Open</span>
                  </div>
                  {project.githubUrl ? <p className="mt-3 truncate text-xs text-steel">{project.githubUrl}</p> : null}
                  <p className="mt-4 text-[11px] text-steel">Updated {new Date(project.updatedAt).toLocaleString()}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
