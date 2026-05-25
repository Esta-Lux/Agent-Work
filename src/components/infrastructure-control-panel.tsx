const systems = [
  {
    title: "Git Sync Network",
    status: "API scaffold ready",
    detail: "Tracks GitHub repository links, branch sync state, and future pull request output.",
    endpoint: "/api/infrastructure/git-sync"
  },
  {
    title: "Live Preview Layer",
    status: "Web and stream modes",
    detail: "Separates browser-native WebContainer previews from remote streamed native runtimes.",
    endpoint: "/api/infrastructure/preview-sessions"
  },
  {
    title: "Sandbox Pooler",
    status: "Fleet telemetry ready",
    detail: "Tracks provider, region, active sandboxes, queued work, capacity, and boot speed.",
    endpoint: "/api/infrastructure/sandbox-pool"
  },
  {
    title: "Vector Memory Sync",
    status: "Job ledger ready",
    detail: "Records manual, scheduled, and GitHub webhook indexing jobs for pgvector freshness.",
    endpoint: "/api/infrastructure/vector-sync"
  },
  {
    title: "Remote Runtime Streams",
    status: "Streaming contract ready",
    detail: "Models noVNC, Guacamole, WebRTC, and WebContainer transports for heavy previews.",
    endpoint: "/api/infrastructure/streams"
  }
];

export function InfrastructureControlPanel() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-steel">Platform Control Plane</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">The heavy infrastructure paths are now explicit</h2>
        </div>
        <a className="rounded border border-line bg-white px-4 py-2 text-sm font-semibold text-graphite" href="/api/infrastructure/status">
          View Status JSON
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {systems.map((system) => (
          <article className="rounded border border-line bg-white p-4" key={system.title}>
            <div className="flex h-full flex-col justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">{system.title}</p>
                <p className="mt-2 rounded bg-cloud px-2 py-1 text-xs font-semibold text-signal">{system.status}</p>
                <p className="mt-3 text-sm leading-6 text-steel">{system.detail}</p>
              </div>
              <code className="block rounded bg-[#0d1418] px-3 py-2 text-xs text-[#c8facc]">{system.endpoint}</code>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
